import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth.js";
import { isValidAppName } from "./apps.js";

export function setupLogStreaming(server: any) {
	const wss = new WebSocketServer({
		noServer: true,
		path: "/api/apps/:name/logs/stream",
	});

	server.on("upgrade", (req: any, socket: any, head: Buffer) => {
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

		wss.handleUpgrade(req, socket, head, (ws: any) => {
			wss.emit("connection", ws, req);
		});
	});

	wss.on("connection", (ws: WebSocket, req: any) => {
		const pathname = new URL(req.url || "", `http://${req.headers.host}`).pathname;
		const match = pathname.match(/^\/api\/apps\/([^/]+)\/logs\/stream$/);

		if (!match) {
			ws.close();
			return;
		}

		const appName = match[1];
		let lineCount = 100;
		let process: any = null;

		// Handle initial line count message
		ws.on("message", (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());
				if (typeof message.lines === "number" && [100, 500, 1000].includes(message.lines)) {
					lineCount = message.lines;
				}
			} catch (error) {
				console.error("Error parsing WebSocket message:", error);
			}
		});

		// Spawn dokku logs process
		const { spawn } = require("child_process");
		process = spawn("dokku", ["logs", appName, "-t", "-n", String(lineCount)]);

		process.stdout.on("data", (data: Buffer) => {
			const lines = data
				.toString()
				.split("\n")
				.filter((line: string) => line.trim());
			lines.forEach((line: string) => {
				ws.send(JSON.stringify({ line }));
			});
		});

		process.stderr.on("data", (data: Buffer) => {
			const lines = data
				.toString()
				.split("\n")
				.filter((line: string) => line.trim());
			lines.forEach((line: string) => {
				ws.send(JSON.stringify({ line, error: true }));
			});
		});

		process.on("error", (error: Error) => {
			ws.send(JSON.stringify({ error: error.message }));
			ws.close();
		});

		process.on("close", () => {
			ws.close();
		});

		ws.on("close", () => {
			if (process && !process.killed) {
				process.kill();
			}
		});

		ws.on("error", (error: Error) => {
			console.error("WebSocket error:", error);
			if (process && !process.killed) {
				process.kill();
			}
		});
	});
}
