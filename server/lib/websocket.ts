import { spawn, type ChildProcess } from "child_process";
import type http from "http";
import type net from "net";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyToken } from "./auth.js";
import { isValidAppName } from "./apps.js";
import { buildRuntimeCommand } from "./executor.js";
import { logger } from "./logger.js";

export function setupLogStreaming(server: http.Server) {
	const wss = new WebSocketServer({
		noServer: true,
	});

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

		wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
			wss.emit("connection", ws, req);
		});
	});

	wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
		const pathname = new URL(req.url || "", `http://${req.headers.host}`).pathname;
		const match = pathname.match(/^\/api\/apps\/([^/]+)\/logs\/stream$/);

		if (!match) {
			ws.close();
			return;
		}

		const appName = match[1];
		let lineCount = 100;
		let logProcess: ChildProcess | null = null;

		// Handle initial line count message
		ws.on("message", (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());
				if (typeof message.lines === "number" && [100, 500, 1000].includes(message.lines)) {
					lineCount = message.lines;
				}
			} catch (error) {
				logger.error({ err: error }, "Error parsing WebSocket message");
			}
		});

		const command = buildRuntimeCommand(`dokku logs ${appName} -t -n ${lineCount}`);
		logProcess = spawn("sh", ["-lc", command]);

		logProcess.stdout?.on("data", (data: Buffer) => {
			const lines = data
				.toString()
				.split("\n")
				.filter((line: string) => line.trim());
			lines.forEach((line: string) => {
				ws.send(JSON.stringify({ line }));
			});
		});

		logProcess.stderr?.on("data", (data: Buffer) => {
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
