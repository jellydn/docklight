import { spawn, type ChildProcess } from "node:child_process";
import type http from "node:http";
import type net from "node:net";
import { WebSocketServer } from "ws";
import type { WebSocket as WS } from "ws";
import { verifyToken } from "./auth.js";
import { isValidAppName } from "./apps.js";
import { buildRuntimeCommand } from "./executor.js";
import { logger } from "./logger.js";
import { DokkuCommands } from "./dokku.js";
import { isCommandAllowed } from "./allowlist.js";

const MAX_CONNECTIONS = Number(process.env.WS_MAX_CONNECTIONS ?? 50);
const IDLE_TIMEOUT_MS = Number(process.env.WS_IDLE_TIMEOUT_MS ?? 30 * 60 * 1000); // 30 minutes
const CLEANUP_INTERVAL_MS = Number(process.env.WS_CLEANUP_INTERVAL_MS ?? 60 * 1000); // 1 minute

interface ExtendedWebSocket extends WS {
	isAlive?: boolean;
	lastActivityAt?: number;
}

interface ExtendedIncomingMessage extends http.IncomingMessage {
	appName?: string;
}

function markActivity(ws: ExtendedWebSocket): void {
	ws.lastActivityAt = Date.now();
}

export function setupLogStreaming(server: http.Server) {
	const wss = new WebSocketServer({
		noServer: true,
	});

	const cleanupInterval = setInterval(() => {
		const now = Date.now();
		const initialActive = wss.clients.size;
		let terminated = 0;

		wss.clients.forEach((client) => {
			const ws = client as ExtendedWebSocket;

			if (ws.lastActivityAt !== undefined && now - ws.lastActivityAt > IDLE_TIMEOUT_MS) {
				logger.info({ idleMs: now - ws.lastActivityAt }, "Terminating idle WebSocket connection");
				ws.terminate();
				terminated++;
				return;
			}

			if (ws.isAlive === false) {
				logger.info("Terminating unresponsive WebSocket connection");
				ws.terminate();
				terminated++;
				return;
			}

			ws.isAlive = false;
			ws.ping();
		});

		if (terminated > 0 || initialActive > 0) {
			logger.info(
				{ active: initialActive - terminated, terminated },
				"WebSocket connection metrics"
			);
		}
	}, CLEANUP_INTERVAL_MS);

	cleanupInterval.unref();

	server.on("upgrade", (req: ExtendedIncomingMessage, socket: net.Socket, head: Buffer) => {
		const pathname = new URL(req.url || "", `http://${req.headers.host}`).pathname;
		const match = pathname.match(/^\/api\/apps\/([^/]+)\/logs\/stream$/);

		if (!match) {
			socket.destroy();
			return;
		}

		const appName = match[1];

		if (!isValidAppName(appName)) {
			socket.destroy();
			return;
		}

		req.appName = appName;

		const cookies: Record<string, string> = {};
		const cookieHeader = req.headers.cookie;
		if (cookieHeader) {
			cookieHeader.split(";").forEach((cookie: string) => {
				const [key, value] = cookie.trim().split("=");
				if (key && value) {
					cookies[key] = value;
				}
			});
		}

		const token = cookies.session;

		if (!token) {
			socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
			socket.destroy();
			return;
		}

		const payload = verifyToken(token);
		if (!payload || !payload.authenticated) {
			socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
			socket.destroy();
			return;
		}

		if (wss.clients.size >= MAX_CONNECTIONS) {
			logger.warn(
				{ current: wss.clients.size, max: MAX_CONNECTIONS },
				"WebSocket connection limit reached"
			);
			socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
			socket.destroy();
			return;
		}

		wss.handleUpgrade(req, socket, head, (ws: WS) => {
			wss.emit("connection", ws, req);
		});
	});

	wss.on("connection", (ws: ExtendedWebSocket, req: ExtendedIncomingMessage) => {
		const appName = req.appName;
		if (!appName) {
			ws.close();
			return;
		}

		ws.isAlive = true;
		markActivity(ws);

		ws.on("pong", () => {
			ws.isAlive = true;
			markActivity(ws);
		});

		logger.info({ active: wss.clients.size }, "WebSocket connection established");
		let lineCount = 100;
		let logProcess: ChildProcess | null = null;

		ws.on("message", (data: Buffer) => {
			markActivity(ws);
			try {
				const message = JSON.parse(data.toString());
				if (typeof message.lines === "number" && [100, 500, 1000].includes(message.lines)) {
					lineCount = message.lines;
				}
			} catch (error) {
				logger.error({ err: error }, "Error parsing WebSocket message");
			}
		});

		const dokkuCommand = DokkuCommands.logsFollow(appName, lineCount);
		if (!isCommandAllowed(dokkuCommand)) {
			logger.error({ command: dokkuCommand }, "Rejected non-allowlisted log streaming command");
			ws.close();
			return;
		}
		const command = buildRuntimeCommand(dokkuCommand);
		logProcess = spawn("sh", ["-lc", command]);

		logProcess.stdout?.on("data", (data: Buffer) => {
			markActivity(ws);
			const lines = data
				.toString()
				.split("\n")
				.filter((line: string) => line.trim());
			lines.forEach((line: string) => {
				ws.send(JSON.stringify({ line }));
			});
		});

		logProcess.stderr?.on("data", (data: Buffer) => {
			markActivity(ws);
			const lines = data
				.toString()
				.split("\n")
				.filter((line: string) => line.trim());
			lines.forEach((line: string) => {
				ws.send(JSON.stringify({ line, error: true }));
			});
		});

		logProcess.on("error", (error: Error) => {
			ws.send(JSON.stringify({ error: error.message }));
			ws.close();
		});

		logProcess.on("close", () => {
			ws.close();
		});

		ws.on("close", () => {
			const logProcessRef = logProcess;
			setImmediate(() => {
				logger.info({ active: wss.clients.size }, "WebSocket connection closed");
			});
			if (logProcessRef && !logProcessRef.killed) {
				logProcessRef.kill();
			}
		});

		ws.on("error", (error: Error) => {
			logger.error({ err: error }, "WebSocket error");
			if (logProcess && !logProcess.killed) {
				logProcess.kill();
			}
		});
	});
}
