import { spawn, type ChildProcess } from "child_process";
import type http from "http";
import type net from "net";
import { WebSocketServer, type WebSocket as WS } from "ws";
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

export function setupLogStreaming(server: http.Server) {
	const wss = new WebSocketServer({
		noServer: true,
	});

	// Periodic cleanup: ping all connections and terminate stale ones
	const cleanupInterval = setInterval(() => {
		const now = Date.now();
		let terminated = 0;

		wss.clients.forEach((client) => {
			const ws = client as ExtendedWebSocket;

			// Terminate if idle too long
			if (ws.lastActivityAt !== undefined && now - ws.lastActivityAt > IDLE_TIMEOUT_MS) {
				logger.info({ idleMs: now - ws.lastActivityAt }, "Terminating idle WebSocket connection");
				ws.terminate();
				terminated++;
				return;
			}

			// Ping/pong heartbeat: terminate if previous ping was not answered
			if (ws.isAlive === false) {
				logger.info("Terminating unresponsive WebSocket connection");
				ws.terminate();
				terminated++;
				return;
			}

			ws.isAlive = false;
			ws.ping();
		});

		if (terminated > 0 || wss.clients.size > 0) {
			logger.info(
				{ active: wss.clients.size, terminated },
				"WebSocket connection metrics"
			);
		}
	}, CLEANUP_INTERVAL_MS);

	// Prevent the interval from keeping the process alive
	cleanupInterval.unref();

	server.on("upgrade", (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
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

		// Enforce connection limit before upgrading
		if (wss.clients.size >= MAX_CONNECTIONS) {
			logger.warn(
				{ current: wss.clients.size, max: MAX_CONNECTIONS },
				"WebSocket connection limit reached"
			);
			socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
			socket.destroy();
			return;
		}

		// Parse cookies from request headers
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

		wss.handleUpgrade(req, socket, head, (ws: WS) => {
			wss.emit("connection", ws, req);
		});
	});

	wss.on("connection", (ws: ExtendedWebSocket, req: http.IncomingMessage) => {
		const pathname = new URL(req.url || "", `http://${req.headers.host}`).pathname;
		const match = pathname.match(/^\/api\/apps\/([^/]+)\/logs\/stream$/);

		if (!match) {
			ws.close();
			return;
		}

		// Initialize heartbeat state
		ws.isAlive = true;
		ws.lastActivityAt = Date.now();

		ws.on("pong", () => {
			ws.isAlive = true;
			ws.lastActivityAt = Date.now();
		});

		logger.info({ active: wss.clients.size }, "WebSocket connection established");

		const appName = match[1];
		let lineCount = 100;
		let logProcess: ChildProcess | null = null;

		// Handle initial line count message
		ws.on("message", (data: Buffer) => {
			ws.lastActivityAt = Date.now();
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
			ws.lastActivityAt = Date.now();
			const lines = data
				.toString()
				.split("\n")
				.filter((line: string) => line.trim());
			lines.forEach((line: string) => {
				ws.send(JSON.stringify({ line }));
			});
		});

		logProcess.stderr?.on("data", (data: Buffer) => {
			ws.lastActivityAt = Date.now();
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
			logger.info({ active: wss.clients.size }, "WebSocket connection closed");
			if (logProcess && !logProcess.killed) {
				logProcess.kill();
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
