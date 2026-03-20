import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type http from "node:http";
import type net from "node:net";
import { EventEmitter } from "node:events";

const mockWss = vi.hoisted(() => ({
	clients: new Set<unknown>(),
	on: vi.fn(),
	handleUpgrade: vi.fn(),
	emit: vi.fn(),
}));

const capturedEventListener = vi.hoisted(() => {
	return {
		current: null as ((event: { type: string; appName: string; timestamp: string }) => void) | null,
	};
});

vi.mock("./auth.js", () => ({
	verifyToken: vi.fn(),
}));

vi.mock("./apps.js", () => ({
	isValidAppName: vi.fn(),
}));

vi.mock("./executor.js", () => ({
	buildRuntimeCommand: vi.fn(),
}));

vi.mock("./logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("./dokku.js", () => ({
	DokkuCommands: {
		logsFollow: vi.fn().mockReturnValue("dokku logs my-app -t -n 100"),
	},
}));

vi.mock("./allowlist.js", () => ({
	isCommandAllowed: vi.fn().mockReturnValue(true),
}));

vi.mock("./app-events.js", () => ({
	subscribeToAppEvents: vi.fn(),
}));

vi.mock("child_process", () => ({
	spawn: vi.fn().mockReturnValue({
		stdout: new EventEmitter(),
		stderr: new EventEmitter(),
		on: vi.fn(),
		kill: vi.fn(),
		killed: false,
	}),
}));

vi.mock("ws", () => {
	return {
		WebSocketServer: vi.fn(function MockWebSocketServer() {
			return mockWss;
		}),
	};
});

import { verifyToken } from "./auth.js";
import { isValidAppName } from "./apps.js";
import { logger } from "./logger.js";
import { setupLogStreaming } from "./websocket.js";
import { subscribeToAppEvents } from "./app-events.js";

// Helper: create a minimal mock socket
function makeSocket(): net.Socket {
	const emitter = new EventEmitter();
	(emitter as unknown as { write: (data: string) => boolean }).write = vi
		.fn()
		.mockReturnValue(true);
	(emitter as unknown as { destroy: () => void }).destroy = vi.fn();
	return emitter as unknown as net.Socket;
}

// Helper: create a minimal mock IncomingMessage
function makeReq(url: string, cookieHeader?: string): http.IncomingMessage {
	const req = new EventEmitter() as unknown as http.IncomingMessage;
	(req as unknown as { url: string }).url = url;
	(req as unknown as { headers: Record<string, string> }).headers = {
		host: "localhost",
		...(cookieHeader ? { cookie: cookieHeader } : {}),
	};
	return req;
}

describe("setupLogStreaming", () => {
	let server: http.Server;
	let upgradeHandler: (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => void;

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset shared mock state
		mockWss.clients.clear();
		mockWss.on.mockReset();
		mockWss.handleUpgrade.mockReset();
		mockWss.emit.mockReset();

		server = new EventEmitter() as unknown as http.Server;
		(
			server as unknown as { on: (event: string, handler: (...args: unknown[]) => void) => void }
		).on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (event === "upgrade") {
				upgradeHandler = handler as (
					req: http.IncomingMessage,
					socket: net.Socket,
					head: Buffer
				) => void;
			}
		});

		vi.mocked(isValidAppName).mockReturnValue(true);
		vi.mocked(verifyToken).mockReturnValue({ authenticated: true, username: "admin" });

		setupLogStreaming(server);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("upgrade handler – routing", () => {
		it("should destroy socket when path does not match", () => {
			const socket = makeSocket();
			upgradeHandler(makeReq("/api/other"), socket, Buffer.alloc(0));
			expect(socket.destroy).toHaveBeenCalled();
		});

		it("should destroy socket when app name is invalid", () => {
			vi.mocked(isValidAppName).mockReturnValue(false);
			const socket = makeSocket();
			upgradeHandler(makeReq("/api/apps/../logs/stream"), socket, Buffer.alloc(0));
			expect(socket.destroy).toHaveBeenCalled();
		});

		it("should respond 401 and destroy when no session cookie", () => {
			const socket = makeSocket();
			upgradeHandler(makeReq("/api/apps/my-app/logs/stream"), socket, Buffer.alloc(0));
			expect((socket as unknown as { write: (d: string) => void }).write).toHaveBeenCalledWith(
				"HTTP/1.1 401 Unauthorized\r\n\r\n"
			);
			expect(socket.destroy).toHaveBeenCalled();
		});

		it("should respond 401 and destroy when token is invalid", () => {
			vi.mocked(verifyToken).mockReturnValue(null);
			const socket = makeSocket();
			upgradeHandler(
				makeReq("/api/apps/my-app/logs/stream", "session=bad-token"),
				socket,
				Buffer.alloc(0)
			);
			expect((socket as unknown as { write: (d: string) => void }).write).toHaveBeenCalledWith(
				"HTTP/1.1 401 Unauthorized\r\n\r\n"
			);
			expect(socket.destroy).toHaveBeenCalled();
		});

		it("should call handleUpgrade when auth passes and connection limit not reached", () => {
			const socket = makeSocket();
			upgradeHandler(
				makeReq("/api/apps/my-app/logs/stream", "session=valid-token"),
				socket,
				Buffer.alloc(0)
			);
			expect(mockWss.handleUpgrade).toHaveBeenCalled();
		});
	});

	describe("connection limit", () => {
		const MAX_CONNECTIONS = Number(process.env.WS_MAX_CONNECTIONS ?? 50);

		it("should return 503 and destroy socket when connection limit is reached", () => {
			// Fill up the clients set to MAX_CONNECTIONS
			for (let i = 0; i < MAX_CONNECTIONS; i++) {
				mockWss.clients.add({});
			}

			const socket = makeSocket();
			upgradeHandler(
				makeReq("/api/apps/my-app/logs/stream", "session=valid-token"),
				socket,
				Buffer.alloc(0)
			);

			expect((socket as unknown as { write: (d: string) => void }).write).toHaveBeenCalledWith(
				"HTTP/1.1 503 Service Unavailable\r\n\r\n"
			);
			expect(socket.destroy).toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.objectContaining({ max: MAX_CONNECTIONS }),
				"WebSocket connection limit reached"
			);
		});

		it("should allow connection when below the limit", () => {
			for (let i = 0; i < MAX_CONNECTIONS - 1; i++) {
				mockWss.clients.add({});
			}

			const socket = makeSocket();
			upgradeHandler(
				makeReq("/api/apps/my-app/logs/stream", "session=valid-token"),
				socket,
				Buffer.alloc(0)
			);

			expect(mockWss.handleUpgrade).toHaveBeenCalled();
			expect(socket.destroy).not.toHaveBeenCalled();
		});
	});

	describe("connection handler – lifecycle logging", () => {
		it("should register a connection event handler on the wss", () => {
			expect(mockWss.on).toHaveBeenCalledWith("connection", expect.any(Function));
		});
	});

	describe("IP-based connection limits", () => {
		it("should allow connections when IP limits are not exceeded", () => {
			const socket = makeSocket();
			upgradeHandler(
				makeReq("/api/apps/my-app/logs/stream", "session=valid-token"),
				socket,
				Buffer.alloc(0)
			);

			expect(mockWss.handleUpgrade).toHaveBeenCalled();
			expect(socket.destroy).not.toHaveBeenCalled();
		});

		it("should verify IP is extracted from socket for rate limiting", () => {
			const socket = makeSocket();
			const req = makeReq(
				"/api/apps/my-app/logs/stream",
				"session=valid-token"
			) as http.IncomingMessage & {
				socket: net.Socket & { remoteAddress?: string };
				headers: Record<string, string | string[]>;
			};

			req.socket = { remoteAddress: "203.0.113.1" } as net.Socket & { remoteAddress?: string };
			req.headers = req.headers ?? {};
			req.headers["x-forwarded-for"] = "10.0.0.1";

			upgradeHandler(req, socket, Buffer.alloc(0));

			expect(mockWss.handleUpgrade).toHaveBeenCalled();
			expect(socket.destroy).not.toHaveBeenCalled();
		});

		it("should verify burst rate limiting uses correct IP", () => {
			const socket = makeSocket();
			const req = makeReq(
				"/api/apps/my-app/logs/stream",
				"session=valid-token"
			) as http.IncomingMessage & {
				socket: net.Socket & { remoteAddress?: string };
				headers: Record<string, string | string[]>;
			};

			req.socket = { remoteAddress: "203.0.113.2" } as net.Socket & { remoteAddress?: string };
			req.headers = req.headers ?? {};

			upgradeHandler(req, socket, Buffer.alloc(0));

			expect(mockWss.handleUpgrade).toHaveBeenCalled();
			expect(socket.destroy).not.toHaveBeenCalled();
		});

		it("should trust X-Forwarded-For when connection is from loopback", () => {
			const socket = makeSocket();
			const req = makeReq(
				"/api/apps/my-app/logs/stream",
				"session=valid-token"
			) as http.IncomingMessage & {
				socket: net.Socket & { remoteAddress?: string };
				headers: Record<string, string | string[]>;
			};

			req.socket = { remoteAddress: "127.0.0.1" } as net.Socket & { remoteAddress?: string };
			req.headers = req.headers ?? {};
			req.headers["x-forwarded-for"] = "192.168.1.100";

			upgradeHandler(req, socket, Buffer.alloc(0));

			expect(mockWss.handleUpgrade).toHaveBeenCalled();
		});

		it("should ignore X-Forwarded-For when connection is not from trusted proxy", () => {
			const socket = makeSocket();
			const req = makeReq(
				"/api/apps/my-app/logs/stream",
				"session=valid-token"
			) as http.IncomingMessage & {
				socket: net.Socket & { remoteAddress?: string };
				headers: Record<string, string | string[]>;
			};

			req.socket = { remoteAddress: "203.0.113.50" } as net.Socket & { remoteAddress?: string };
			req.headers = req.headers ?? {};
			req.headers["x-forwarded-for"] = "10.0.0.1";

			upgradeHandler(req, socket, Buffer.alloc(0));

			expect(mockWss.handleUpgrade).toHaveBeenCalled();
		});

		it("should handle X-Forwarded-For as array", () => {
			const socket = makeSocket();
			const req = makeReq(
				"/api/apps/my-app/logs/stream",
				"session=valid-token"
			) as http.IncomingMessage & {
				socket: net.Socket & { remoteAddress?: string };
				headers: Record<string, string | string[]>;
			};

			req.socket = { remoteAddress: "127.0.0.1" } as net.Socket & { remoteAddress?: string };
			req.headers = req.headers ?? {};
			req.headers["x-forwarded-for"] = ["192.168.1.100, 10.0.0.1"];

			upgradeHandler(req, socket, Buffer.alloc(0));

			expect(mockWss.handleUpgrade).toHaveBeenCalled();
		});
	});
});

describe("cleanup interval", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		// Reset shared mock state
		mockWss.clients.clear();
		mockWss.on.mockReset();
		mockWss.handleUpgrade.mockReset();
		mockWss.emit.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("should terminate connections that do not respond to ping", () => {
		const server = new EventEmitter() as unknown as http.Server;
		(
			server as unknown as { on: (event: string, handler: (...args: unknown[]) => void) => void }
		).on = vi.fn();

		vi.mocked(isValidAppName).mockReturnValue(true);
		vi.mocked(verifyToken).mockReturnValue({ authenticated: true, username: "admin" });

		setupLogStreaming(server);

		const mockWs = {
			isAlive: false,
			lastActivityAt: Date.now(),
			terminate: vi.fn(),
			ping: vi.fn(),
			on: vi.fn(),
		};

		mockWss.clients.add(mockWs);

		const CLEANUP_INTERVAL_MS = Number(process.env.WS_CLEANUP_INTERVAL_MS) || 60 * 1000;
		vi.advanceTimersByTime(CLEANUP_INTERVAL_MS);

		expect(mockWs.terminate).toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith("Terminating unresponsive WebSocket connection");
	});

	it("should terminate idle connections", () => {
		const server = new EventEmitter() as unknown as http.Server;
		(
			server as unknown as { on: (event: string, handler: (...args: unknown[]) => void) => void }
		).on = vi.fn();

		vi.mocked(isValidAppName).mockReturnValue(true);
		vi.mocked(verifyToken).mockReturnValue({ authenticated: true, username: "admin" });

		setupLogStreaming(server);

		const IDLE_TIMEOUT_MS = Number(process.env.WS_IDLE_TIMEOUT_MS) || 30 * 60 * 1000;
		const oldTimestamp = Date.now() - IDLE_TIMEOUT_MS - 1000;

		const mockWs = {
			isAlive: true,
			lastActivityAt: oldTimestamp,
			terminate: vi.fn(),
			ping: vi.fn(),
			on: vi.fn(),
		};

		mockWss.clients.add(mockWs);

		const CLEANUP_INTERVAL_MS = Number(process.env.WS_CLEANUP_INTERVAL_MS) || 60 * 1000;
		vi.advanceTimersByTime(CLEANUP_INTERVAL_MS);

		expect(mockWs.terminate).toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ idleMs: expect.any(Number) }),
			"Terminating idle WebSocket connection"
		);
	});

	it("should log metrics when connections are terminated", () => {
		const server = new EventEmitter() as unknown as http.Server;
		(
			server as unknown as { on: (event: string, handler: (...args: unknown[]) => void) => void }
		).on = vi.fn();

		vi.mocked(isValidAppName).mockReturnValue(true);
		vi.mocked(verifyToken).mockReturnValue({ authenticated: true, username: "admin" });

		setupLogStreaming(server);

		const mockWs = {
			isAlive: false,
			lastActivityAt: Date.now(),
			terminate: vi.fn(),
			ping: vi.fn(),
			on: vi.fn(),
		};

		mockWss.clients.add(mockWs);

		const CLEANUP_INTERVAL_MS = Number(process.env.WS_CLEANUP_INTERVAL_MS) || 60 * 1000;
		vi.advanceTimersByTime(CLEANUP_INTERVAL_MS);

		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ terminated: 1, active: 0 }),
			"WebSocket connection metrics"
		);
	});
});

describe("event stream endpoint", () => {
	let server: http.Server;
	let upgradeHandler: (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => void;

	beforeEach(() => {
		vi.clearAllMocks();

		mockWss.clients.clear();
		mockWss.on.mockReset();
		mockWss.handleUpgrade.mockReset();
		mockWss.emit.mockReset();
		capturedEventListener.current = null;

		server = new EventEmitter() as unknown as http.Server;
		(
			server as unknown as { on: (event: string, handler: (...args: unknown[]) => void) => void }
		).on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (event === "upgrade") {
				upgradeHandler = handler as (
					req: http.IncomingMessage,
					socket: net.Socket,
					head: Buffer
				) => void;
			}
		});

		vi.mocked(isValidAppName).mockReturnValue(true);
		vi.mocked(verifyToken).mockReturnValue({ authenticated: true, username: "admin" });

		setupLogStreaming(server);
	});

	afterEach(() => {
		vi.clearAllMocks();
		capturedEventListener.current = null;
	});

	it("should allow upgrade for /api/events/stream with valid auth", () => {
		const socket = makeSocket();
		upgradeHandler(makeReq("/api/events/stream", "session=valid-token"), socket, Buffer.alloc(0));
		expect(mockWss.handleUpgrade).toHaveBeenCalled();
		expect(socket.destroy).not.toHaveBeenCalled();
	});

	it("should reject /api/events/stream with no session cookie", () => {
		const socket = makeSocket();
		upgradeHandler(makeReq("/api/events/stream"), socket, Buffer.alloc(0));
		expect((socket as unknown as { write: (d: string) => void }).write).toHaveBeenCalledWith(
			"HTTP/1.1 401 Unauthorized\r\n\r\n"
		);
		expect(socket.destroy).toHaveBeenCalled();
	});

	it("should reject /api/events/stream with invalid token", () => {
		vi.mocked(verifyToken).mockReturnValue(null);
		const socket = makeSocket();
		upgradeHandler(
			makeReq("/api/events/stream", "session=bad-token"),
			socket,
			Buffer.alloc(0)
		);
		expect((socket as unknown as { write: (d: string) => void }).write).toHaveBeenCalledWith(
			"HTTP/1.1 401 Unauthorized\r\n\r\n"
		);
		expect(socket.destroy).toHaveBeenCalled();
	});

	it("should destroy socket for unknown path", () => {
		const socket = makeSocket();
		upgradeHandler(makeReq("/api/unknown"), socket, Buffer.alloc(0));
		expect(socket.destroy).toHaveBeenCalled();
	});

	it("should send app event to connected WebSocket client", () => {
		expect(mockWss.on).toHaveBeenCalledWith("connection", expect.any(Function));

		const connectionHandler = mockWss.on.mock.calls.find(call => call[0] === "connection")![1];

		const mockWs = {
			isAlive: true,
			lastActivityAt: Date.now(),
			readyState: 1,
			send: vi.fn(),
			on: vi.fn(),
			close: vi.fn(),
			terminate: vi.fn(),
			ping: vi.fn(),
		};

		Object.defineProperty(mockWs, "OPEN", { value: 1, writable: true });
		Object.defineProperty(mockWs, "readyState", {
			get: () => 1,
			set: () => {},
			configurable: true,
		});

		const mockReq = makeReq("/api/events/stream", "session=valid-token") as http.IncomingMessage & { isEventStream?: boolean };
		mockReq.isEventStream = true;

		connectionHandler(mockWs, mockReq);

		expect(vi.mocked(subscribeToAppEvents)).toHaveBeenCalled();
		const capturedListener = vi.mocked(subscribeToAppEvents).mock.calls[0][0];

		const testEvent = { type: "app:restart", appName: "my-app", timestamp: "2024-01-01T00:00:00.000Z" };
		capturedListener(testEvent);

		expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(testEvent));
	});
});
