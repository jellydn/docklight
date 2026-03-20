import { spawn, type ChildProcess } from "node:child_process";
import type http from "node:http";
import type net from "node:net";
import { WebSocketServer } from "ws";
import type { WebSocket as WS } from "ws";
import { verifyToken, type JWTPayload } from "./auth.js";
import { isValidAppName } from "./apps.js";
import { buildRuntimeCommand } from "./executor.js";
import { logger } from "./logger.js";
import { DokkuCommands } from "./dokku.js";
import { isCommandAllowed } from "./allowlist.js";
import { getClientIP } from "./ip-utils.js";
import { subscribeToAppEvents } from "./app-events.js";

const MAX_CONNECTIONS = Number(process.env.WS_MAX_CONNECTIONS ?? 50);
const MAX_CONNECTIONS_PER_USER = Number(process.env.WS_MAX_CONNECTIONS_PER_USER ?? 5);
const MAX_CONNECTIONS_PER_IP = Number(process.env.WS_MAX_CONNECTIONS_PER_IP ?? 10);
const MAX_IP_BURST_RATE = Number(process.env.WS_MAX_IP_BURST_RATE ?? 30);
const IP_BURST_WINDOW_MS = Number(process.env.WS_IP_BURST_WINDOW_MS ?? 60 * 1000); // 1 minute
const IDLE_TIMEOUT_MS = Number(process.env.WS_IDLE_TIMEOUT_MS ?? 30 * 60 * 1000); // 30 minutes - affects all WS connections including event stream
const CLEANUP_INTERVAL_MS = Number(process.env.WS_CLEANUP_INTERVAL_MS ?? 60 * 1000);

interface ExtendedWebSocket extends WS {
	isAlive?: boolean;
	lastActivityAt?: number;
	userId?: number | string;
	clientIP?: string;
}

interface ExtendedIncomingMessage extends http.IncomingMessage {
	appName?: string;
	userId?: number | string;
	clientIP?: string;
	isEventStream?: boolean;
}

function markActivity(ws: ExtendedWebSocket): void {
	ws.lastActivityAt = Date.now();
}

function getUserIdentifier(payload: JWTPayload): number | string {
	return payload.userId ?? payload.username ?? "anonymous";
}

function getUserConnectionCount(
	userId: number | string,
	connectionsPerUser: Map<number | string, Set<ExtendedWebSocket>>
): number {
	return connectionsPerUser.get(userId)?.size ?? 0;
}

function getIPConnectionCount(
	ip: string,
	connectionsPerIP: Map<string, Set<ExtendedWebSocket>>
): number {
	return connectionsPerIP.get(ip)?.size ?? 0;
}

interface IPBurstTracker {
	timestamps: number[];
}

function checkIPBurstLimit(
	ip: string,
	burstTrackers: Map<string, IPBurstTracker>,
	now: number
): boolean {
	if (!burstTrackers.has(ip)) {
		burstTrackers.set(ip, { timestamps: [] });
	}

	const tracker = burstTrackers.get(ip);
	if (!tracker) return true;

	const windowStart = now - IP_BURST_WINDOW_MS;
	tracker.timestamps = tracker.timestamps.filter((ts) => ts > windowStart);

	if (tracker.timestamps.length >= MAX_IP_BURST_RATE) {
		return false;
	}

	tracker.timestamps.push(now);
	return true;
}

function cleanupOldBurstEntries(burstTrackers: Map<string, IPBurstTracker>, now: number): void {
	const windowStart = now - IP_BURST_WINDOW_MS;
	for (const [ip, tracker] of burstTrackers.entries()) {
		tracker.timestamps = tracker.timestamps.filter((ts) => ts > windowStart);
		if (tracker.timestamps.length === 0) {
			burstTrackers.delete(ip);
		}
	}
}

function removeFromPerUserTracking(
	userId: number | string,
	ws: ExtendedWebSocket,
	connectionsPerUser: Map<number | string, Set<ExtendedWebSocket>>
): void {
	const userConnections = connectionsPerUser.get(userId);
	if (userConnections) {
		userConnections.delete(ws);
		if (userConnections.size === 0) {
			connectionsPerUser.delete(userId);
		}
	}
}

function removeFromPerIPTracking(
	ip: string,
	ws: ExtendedWebSocket,
	connectionsPerIP: Map<string, Set<ExtendedWebSocket>>
): void {
	const ipConnections = connectionsPerIP.get(ip);
	if (ipConnections) {
		ipConnections.delete(ws);
		if (ipConnections.size === 0) {
			connectionsPerIP.delete(ip);
		}
	}
}

function sendLogLines(ws: ExtendedWebSocket, data: Buffer, isError: boolean): void {
	markActivity(ws);
	const lines = data.toString().split("\n");
	for (const line of lines) {
		if (line.trim()) {
			ws.send(JSON.stringify({ line, error: isError }));
		}
	}
}

export function setupLogStreaming(server: http.Server) {
	const wss = new WebSocketServer({
		noServer: true,
	});

	// Track connections per user for per-user limits
	const connectionsPerUser = new Map<number | string, Set<ExtendedWebSocket>>();

	// Track connections per IP for per-IP limits
	const connectionsPerIP = new Map<string, Set<ExtendedWebSocket>>();

	// Track IP burst connections for rate limiting
	const ipBurstTrackers = new Map<string, IPBurstTracker>();

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

		cleanupOldBurstEntries(ipBurstTrackers, now);

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
		const logMatch = pathname.match(/^\/api\/apps\/([^/]+)\/logs\/stream$/);
		const eventsMatch = pathname === "/api/events/stream";

		if (!logMatch && !eventsMatch) {
			socket.destroy();
			return;
		}

		if (logMatch) {
			const appName = logMatch[1];

			if (!isValidAppName(appName)) {
				socket.destroy();
				return;
			}

			req.appName = appName;
		}

		if (eventsMatch) {
			req.isEventStream = true;
		}

		const clientIP = getClientIP(req) ?? "unknown";
		req.clientIP = clientIP;

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

		const userId = getUserIdentifier(payload);
		req.userId = userId;

		// Check per-user connection limit
		if (getUserConnectionCount(userId, connectionsPerUser) >= MAX_CONNECTIONS_PER_USER) {
			logger.warn(
				{
					userId,
					current: getUserConnectionCount(userId, connectionsPerUser),
					max: MAX_CONNECTIONS_PER_USER,
				},
				"WebSocket per-user connection limit reached"
			);
			socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
			socket.destroy();
			return;
		}

		// Check per-IP connection limit
		if (getIPConnectionCount(clientIP, connectionsPerIP) >= MAX_CONNECTIONS_PER_IP) {
			logger.warn(
				{
					clientIP,
					current: getIPConnectionCount(clientIP, connectionsPerIP),
					max: MAX_CONNECTIONS_PER_IP,
				},
				"WebSocket per-IP connection limit reached"
			);
			socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
			socket.destroy();
			return;
		}

		// Check IP burst rate limit
		if (!checkIPBurstLimit(clientIP, ipBurstTrackers, Date.now())) {
			logger.warn(
				{
					clientIP,
					maxRate: MAX_IP_BURST_RATE,
					windowMs: IP_BURST_WINDOW_MS,
				},
				"WebSocket IP burst rate limit exceeded"
			);
			socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
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
		const isEventStream = req.isEventStream === true;

		if (!appName && !isEventStream) {
			ws.close();
			return;
		}

		const userId = req.userId;
		const clientIP = req.clientIP ?? "unknown";
		ws.clientIP = clientIP;

		if (userId) {
			ws.userId = userId;
			// Track connection per user
			if (!connectionsPerUser.has(userId)) {
				connectionsPerUser.set(userId, new Set());
			}
			const userConnections = connectionsPerUser.get(userId);
			if (userConnections) {
				userConnections.add(ws);
			}
		}

		// Track connection per IP
		if (!connectionsPerIP.has(clientIP)) {
			connectionsPerIP.set(clientIP, new Set());
		}
		const ipConnections = connectionsPerIP.get(clientIP);
		if (ipConnections) {
			ipConnections.add(ws);
		}

		ws.isAlive = true;
		markActivity(ws);

		ws.on("pong", () => {
			ws.isAlive = true;
			markActivity(ws);
		});

		logger.info(
			{ userId, active: wss.clients.size, isEventStream },
			"WebSocket connection established"
		);

		const handleClose = (logProcess?: ChildProcess | null) => {
			setImmediate(() => {
				logger.info({ userId, active: wss.clients.size }, "WebSocket connection closed");
			});
			if (logProcess && !logProcess.killed) {
				logProcess.kill();
			}
			if (userId) {
				removeFromPerUserTracking(userId, ws, connectionsPerUser);
			}
			removeFromPerIPTracking(clientIP, ws, connectionsPerIP);
		};

		const handleError = (error: Error, logProcess?: ChildProcess | null) => {
			logger.error({ err: error }, "WebSocket error");
			if (logProcess && !logProcess.killed) {
				logProcess.kill();
			}
			if (userId) {
				removeFromPerUserTracking(userId, ws, connectionsPerUser);
			}
			removeFromPerIPTracking(clientIP, ws, connectionsPerIP);
		};

		if (isEventStream) {
			const unsubscribe = subscribeToAppEvents((event) => {
				if (ws.readyState === ws.OPEN) {
					markActivity(ws);
					ws.send(JSON.stringify(event));
				}
			});

			ws.on("close", () => {
				unsubscribe();
				handleClose();
			});

			ws.on("error", (error: Error) => {
				unsubscribe();
				handleError(error);
			});

			return;
		}

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

		const dokkuCommand = DokkuCommands.logsFollow(appName as string, lineCount);
		if (!isCommandAllowed(dokkuCommand)) {
			logger.error({ command: dokkuCommand }, "Rejected non-allowlisted log streaming command");
			ws.close();
			return;
		}
		const command = buildRuntimeCommand(dokkuCommand);
		logProcess = spawn("sh", ["-lc", command]);

		logProcess.stdout?.on("data", (data: Buffer) => sendLogLines(ws, data, false));

		logProcess.stderr?.on("data", (data: Buffer) => sendLogLines(ws, data, true));

		logProcess.on("error", (error: Error) => {
			ws.send(JSON.stringify({ error: error.message }));
			ws.close();
		});

		logProcess.on("close", () => {
			ws.close();
		});

		ws.on("close", () => {
			handleClose(logProcess);
		});

		ws.on("error", (error: Error) => {
			handleError(error, logProcess);
		});
	});
}
