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
