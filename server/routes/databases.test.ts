import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/executor.js", () => ({
	executeCommand: vi.fn(),
	executeCommandStreaming: vi.fn(),
}));
vi.mock("../lib/db.js", () => ({ insertAuditLog: vi.fn() }));
vi.mock("../lib/auth.js", () => ({
	authMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
	requireOperator: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { executeCommand, executeCommandStreaming } from "../lib/executor.js";
import { registerDatabaseRoutes } from "./databases.js";

describe.each(["application/json", "text/event-stream"])("Database link: %s", (accept) => {
	const app = express();
	app.use(express.json());
	registerDatabaseRoutes(app);
	beforeEach(() => {
		vi.clearAllMocks();
		const result = { command: "", exitCode: 0, stdout: "", stderr: "" };
		vi.mocked(executeCommand).mockResolvedValue(result);
		vi.mocked(executeCommandStreaming).mockResolvedValue(result);
	});

	it.each([
		{ alias: 42 },
		{ alias: false },
		{ alias: null },
		{ alias: {} },
		{ alias: "BAD;ALIAS" },
		{ app: 42 },
		{ app: "web;whoami" },
		{ plugin: "unknown" },
	])("rejects invalid input %j before execution", async (input) => {
		const response = await request(app)
			.post("/api/databases/store/link")
			.set("Accept", accept)
			.send({ plugin: "postgres", app: "web", ...input });
		expect(response.status).toBe(400);
		expect(response.body.exitCode).toBe(400);
		expect(executeCommand).not.toHaveBeenCalled();
		expect(executeCommandStreaming).not.toHaveBeenCalled();
	});

	it.each([
		[" BLUE_DATABASE ", " --alias 'BLUE_DATABASE'"],
		["   ", ""],
		[undefined, ""],
	])("normalizes alias %s", async (alias, suffix) => {
		const response = await request(app)
			.post("/api/databases/store/link")
			.set("Accept", accept)
			.send({ plugin: "postgres", app: "web", alias });
		expect(response.status).toBe(200);
		const command = `dokku postgres:link 'store' 'web'${suffix}`;
		if (accept === "text/event-stream") {
			expect(executeCommandStreaming).toHaveBeenCalledWith(command, expect.any(Function), 60000);
			expect(response.text).toContain('"exitCode":0');
		} else {
			expect(executeCommand).toHaveBeenCalledWith(command);
			expect(response.body.exitCode).toBe(0);
		}
	});
});
