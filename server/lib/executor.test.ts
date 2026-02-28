import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SSHPool, sshPool, buildRuntimeCommand, executeCommand } from "./executor.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./allowlist.js", () => ({
	isCommandAllowed: vi.fn((cmd: string) => cmd.startsWith("dokku ")),
}));

vi.mock("./db.js", () => ({
	saveCommand: vi.fn(),
}));

// Mock the SSH instance - needs to be defined before the mock factory
const mockSshInstance = {
	connect: vi.fn(),
	execCommand: vi.fn(),
	isConnected: vi.fn(),
	dispose: vi.fn(),
};

// NodeSSH must be a regular function (not arrow) so it can be used as a constructor.
// Returning an object from a constructor causes `new NodeSSH()` to return that object.
vi.mock("node-ssh", () => ({
	// biome-ignore lint/complexity/useArrowFunction: regular function required for constructor mock
	NodeSSH: vi.fn(function () {
		return mockSshInstance;
	}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockExecResult = { stdout: string; stderr: string; code: number; signal: null };

function makeExecResult(
	stdout: string,
	stderr: string,
	code: number
): MockExecResult {
	return { stdout, stderr, code, signal: null };
}

// ---------------------------------------------------------------------------
// SSHPool
// ---------------------------------------------------------------------------

describe("SSHPool", () => {
	let pool: SSHPool;

	beforeEach(() => {
		vi.clearAllMocks();
		pool = new SSHPool();
		mockSshInstance.connect.mockResolvedValue(undefined);
		mockSshInstance.isConnected.mockReturnValue(true);
	});

	it("creates a new connection when none exists", async () => {
		const conn = await pool.getConnection("dokku@host");
		expect(mockSshInstance.connect).toHaveBeenCalledOnce();
		expect(conn).toBeDefined();
	});

	it("reuses an existing connected connection", async () => {
		await pool.getConnection("dokku@host");
		await pool.getConnection("dokku@host");
		expect(mockSshInstance.connect).toHaveBeenCalledOnce();
	});

	it("reconnects when existing connection is not connected", async () => {
		await pool.getConnection("dokku@host");
		mockSshInstance.isConnected.mockReturnValue(false);
		await pool.getConnection("dokku@host");
		expect(mockSshInstance.connect).toHaveBeenCalledTimes(2);
		expect(mockSshInstance.dispose).toHaveBeenCalledOnce();
	});

	it("passes parsed host, username, and port to connect()", async () => {
		await pool.getConnection("myuser@myhost:2222");
		expect(mockSshInstance.connect).toHaveBeenCalledWith(
			expect.objectContaining({ host: "myhost", username: "myuser", port: 2222 })
		);
	});

	it("uses port 22 when no port is specified", async () => {
		await pool.getConnection("dokku@myhost");
		expect(mockSshInstance.connect).toHaveBeenCalledWith(expect.objectContaining({ port: 22 }));
	});

	it("passes privateKeyPath when keyPath is provided", async () => {
		await pool.getConnection("dokku@host", "/home/user/.ssh/id_rsa");
		expect(mockSshInstance.connect).toHaveBeenCalledWith(
			expect.objectContaining({ privateKeyPath: "/home/user/.ssh/id_rsa" })
		);
	});

	it("throws when target has no @ character", async () => {
		await expect(pool.getConnection("invalidtarget")).rejects.toThrow("Invalid SSH target");
	});

	it("closeConnection disposes the connection and clears it", async () => {
		await pool.getConnection("dokku@host");
		pool.closeConnection("dokku@host");
		expect(mockSshInstance.dispose).toHaveBeenCalledOnce();
		// After closing, a new connect call should be made on next getConnection
		await pool.getConnection("dokku@host");
		expect(mockSshInstance.connect).toHaveBeenCalledTimes(2);
	});

	it("closeAll disposes all connections", async () => {
		await pool.getConnection("dokku@host1");
		await pool.getConnection("dokku@host2");
		pool.closeAll();
		expect(mockSshInstance.dispose).toHaveBeenCalledTimes(2);
	});

	it("closes connection after idle timeout", async () => {
		vi.useFakeTimers();
		await pool.getConnection("dokku@host");
		expect(mockSshInstance.connect).toHaveBeenCalledTimes(1);

		// Advance time past the 5-minute idle timeout
		vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

		expect(mockSshInstance.dispose).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});

	it("resets idle timer on connection reuse", async () => {
		vi.useFakeTimers();
		await pool.getConnection("dokku@host");

		// Advance partially through timeout
		vi.advanceTimersByTime(3 * 60 * 1000);

		// Reuse the connection - should reset timer
		mockSshInstance.isConnected.mockReturnValue(true);
		await pool.getConnection("dokku@host");

		// Advance past original timeout
		vi.advanceTimersByTime(3 * 60 * 1000);

		// Connection should still be alive (not disposed yet)
		expect(mockSshInstance.dispose).not.toHaveBeenCalled();

		// Now advance past the new timeout
		vi.advanceTimersByTime(2 * 60 * 1000 + 1000);

		expect(mockSshInstance.dispose).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});
});

// ---------------------------------------------------------------------------
// executeCommand – SSH pool path
// ---------------------------------------------------------------------------

describe("executeCommand with SSH pool", () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = {
			...OLD_ENV,
			DOCKLIGHT_DOKKU_SSH_TARGET: "dokku@server",
		};
		delete process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET;
		delete process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH;
		mockSshInstance.connect.mockResolvedValue(undefined);
		mockSshInstance.isConnected.mockReturnValue(true);
		// Reset sshPool state between tests
		sshPool.closeAll();
	});

	afterEach(() => {
		process.env = OLD_ENV;
		sshPool.closeAll();
	});

	it("executes a dokku command via the SSH pool on success", async () => {
		mockSshInstance.execCommand.mockResolvedValue(makeExecResult("app1\napp2", "", 0));

		const result = await executeCommand("dokku apps:list");

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe("app1\napp2");
		expect(mockSshInstance.execCommand).toHaveBeenCalledWith("dokku apps:list");
	});

	it("returns non-zero exit code when remote command fails", async () => {
		mockSshInstance.execCommand.mockResolvedValue(makeExecResult("", "App not found", 1));

		const result = await executeCommand("dokku apps:info missing-app");

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toBe("App not found");
	});

	it("appends sudo hint when root command fails with password error", async () => {
		process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET = "root@server";
		mockSshInstance.execCommand.mockResolvedValue(
			makeExecResult("", "sudo: a password is required", 1)
		);

		const result = await executeCommand("dokku plugin:install repo", 30000, { asRoot: true });

		expect(result.stderr).toContain("Hint:");
	});

	it("retries once on connection failure and returns error if retry also fails", async () => {
		mockSshInstance.connect.mockRejectedValue(new Error("Connection refused"));

		const result = await executeCommand("dokku apps:list");

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("SSH connection failed");
		expect(result.stderr).toContain("initial:");
		expect(result.stderr).toContain("retry:");
		expect(result.stderr).toContain("Connection refused");
		expect(mockSshInstance.connect).toHaveBeenCalledTimes(2);
	});

	it("falls back to default target when root target has auth failure", async () => {
		process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET = "root@server";
		let connectCallCount = 0;
		mockSshInstance.connect.mockImplementation(() => {
			connectCallCount++;
			if (connectCallCount === 1) return Promise.reject(new Error("Authentication failed"));
			return Promise.resolve();
		});
		mockSshInstance.execCommand.mockResolvedValue(makeExecResult("ok", "", 0));

		const result = await executeCommand("dokku plugin:list", 30000, { asRoot: true });

		expect(result.exitCode).toBe(0);
	});

	it("returns error on command timeout", async () => {
		mockSshInstance.execCommand.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 60000))
		);

		const result = await executeCommand("dokku apps:list", 50);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("timed out");
	});

	it("does NOT use the pool for non-dokku commands (falls through to shell exec)", async () => {
		// isCommandAllowed is mocked to return false for non-dokku commands
		const result = await executeCommand("ls -la");
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Command not allowed");
		expect(mockSshInstance.execCommand).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// buildRuntimeCommand (kept for backwards-compatibility)
// ---------------------------------------------------------------------------

describe("buildRuntimeCommand", () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		process.env = { ...OLD_ENV };
	});

	afterEach(() => {
		process.env = OLD_ENV;
	});

	it("returns the command as-is when no SSH target is set", () => {
		delete process.env.DOCKLIGHT_DOKKU_SSH_TARGET;
		expect(buildRuntimeCommand("dokku apps:list")).toBe("dokku apps:list");
	});

	it("wraps the command in ssh when SSH target is configured", () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "dokku@myserver";
		delete process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH;
		delete process.env.DOCKLIGHT_DOKKU_SSH_OPTS;
		const cmd = buildRuntimeCommand("dokku apps:list");
		expect(cmd).toContain("ssh");
		expect(cmd).toContain("dokku@myserver");
		expect(cmd).toContain("dokku apps:list");
	});

	it("does not wrap non-dokku commands in ssh", () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "dokku@myserver";
		expect(buildRuntimeCommand("ls -la")).toBe("ls -la");
	});
});
