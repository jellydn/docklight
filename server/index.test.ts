import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import request from "supertest";

vi.mock("./lib/apps.js", () => ({
	getApps: vi.fn(),
	getAppDetail: vi.fn(),
	restartApp: vi.fn(),
	rebuildApp: vi.fn(),
	scaleApp: vi.fn(),
}));

vi.mock("./lib/auth.js", () => ({
	authMiddleware: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	setAuthCookie: vi.fn(),
	clearAuthCookie: vi.fn(),
	login: vi.fn(),
}));

vi.mock("./lib/config.js", () => ({
	getConfig: vi.fn(),
	setConfig: vi.fn(),
	unsetConfig: vi.fn(),
}));

vi.mock("./lib/databases.js", () => ({
	getDatabases: vi.fn(),
	createDatabase: vi.fn(),
	destroyDatabase: vi.fn(),
	linkDatabase: vi.fn(),
	unlinkDatabase: vi.fn(),
}));

vi.mock("./lib/db.js", () => ({
	getRecentCommands: vi.fn(),
}));

vi.mock("./lib/domains.js", () => ({
	getDomains: vi.fn(),
	addDomain: vi.fn(),
	removeDomain: vi.fn(),
}));

vi.mock("./lib/plugins.js", () => ({
	getPlugins: vi.fn(),
	installPlugin: vi.fn(),
	uninstallPlugin: vi.fn(),
	enablePlugin: vi.fn(),
	disablePlugin: vi.fn(),
}));

vi.mock("./lib/logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("./lib/server.js", () => ({
	getServerHealth: vi.fn(),
}));

vi.mock("./lib/ssl.js", () => ({
	enableSSL: vi.fn(),
	getSSL: vi.fn(),
	renewSSL: vi.fn(),
}));

vi.mock("./lib/websocket.js", () => ({
	setupLogStreaming: vi.fn(),
}));

import { getApps, getAppDetail, restartApp, rebuildApp, scaleApp } from "./lib/apps.js";
import { authMiddleware, setAuthCookie, clearAuthCookie, login } from "./lib/auth.js";
import { getConfig, setConfig, unsetConfig } from "./lib/config.js";
import {
	getDatabases,
	createDatabase,
	destroyDatabase,
	linkDatabase,
	unlinkDatabase,
} from "./lib/databases.js";
import { getRecentCommands } from "./lib/db.js";
import { getDomains, addDomain, removeDomain } from "./lib/domains.js";
import {
	disablePlugin,
	enablePlugin,
	getPlugins,
	installPlugin,
	uninstallPlugin,
} from "./lib/plugins.js";
import { getServerHealth } from "./lib/server.js";
import { enableSSL, getSSL, renewSSL } from "./lib/ssl.js";

type AsyncHandler = (req: Request<Record<string, string>>, res: Response) => Promise<void>;

function createTestApp(): Express {
	const app = express();
	app.use(express.json());

	app.get("/api/health", (_req, res) => {
		res.json({ status: "ok" });
	});

	app.post("/api/auth/login", (req, res) => {
		const { password } = req.body;
		if (login(password)) {
			setAuthCookie(res);
			res.json({ success: true });
		} else {
			res.status(401).json({ error: "Invalid password" });
		}
	});

	app.post("/api/auth/logout", (_req, res) => {
		clearAuthCookie(res);
		res.json({ success: true });
	});

	app.get(
		"/api/auth/me",
		(req, res, next) => {
			(authMiddleware as (req: Request, res: Response, next: NextFunction) => void)(req, res, next);
		},
		(_req, res) => {
			res.json({ authenticated: true });
		}
	);

	const withAuth = (handler: AsyncHandler) => {
		return async (req: Request, res: Response, next: NextFunction) => {
			(authMiddleware as (req: Request, res: Response, next: NextFunction) => void)(
				req,
				res,
				() => {
					handler(req as Request<Record<string, string>>, res).catch(next);
				}
			);
		};
	};

	app.get(
		"/api/apps",
		withAuth(async (_req, res) => {
			const apps = await getApps();
			if (!Array.isArray(apps)) {
				res.status(apps.exitCode >= 400 ? apps.exitCode : 500).json(apps);
				return;
			}
			res.json(apps);
		})
	);

	app.get(
		"/api/apps/:name",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const app = await getAppDetail(name);
			res.json(app);
		})
	);

	app.post(
		"/api/apps/:name/restart",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const result = await restartApp(name);
			res.json(result);
		})
	);

	app.post(
		"/api/apps/:name/rebuild",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const result = await rebuildApp(name);
			res.json(result);
		})
	);

	app.post(
		"/api/apps/:name/scale",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { processType, count } = req.body;
			const result = await scaleApp(name, processType, count);
			res.json(result);
		})
	);

	app.get(
		"/api/server/health",
		withAuth(async (_req, res) => {
			const health = await getServerHealth();
			res.json(health);
		})
	);

	app.get(
		"/api/apps/:name/config",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const config = await getConfig(name);
			res.json(config);
		})
	);

	app.post(
		"/api/apps/:name/config",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { key, value } = req.body;
			const result = await setConfig(name, key, value);
			res.json(result);
		})
	);

	app.delete(
		"/api/apps/:name/config/:key",
		withAuth(async (req, res) => {
			const { name, key } = req.params;
			const result = await unsetConfig(name, key);
			res.json(result);
		})
	);

	app.get(
		"/api/apps/:name/domains",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const domains = await getDomains(name);
			res.json(domains);
		})
	);

	app.post(
		"/api/apps/:name/domains",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { domain } = req.body;
			const result = await addDomain(name, domain);
			res.json(result);
		})
	);

	app.delete(
		"/api/apps/:name/domains/:domain",
		withAuth(async (req, res) => {
			const { name, domain } = req.params;
			const result = await removeDomain(name, domain);
			res.json(result);
		})
	);

	app.get(
		"/api/databases",
		withAuth(async (_req, res) => {
			const databases = await getDatabases();
			res.json(databases);
		})
	);

	app.post(
		"/api/databases",
		withAuth(async (req, res) => {
			const { plugin, name } = req.body;
			const result = await createDatabase(plugin, name);
			res.json(result);
		})
	);

	app.post(
		"/api/databases/:name/link",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { plugin, app } = req.body;
			const result = await linkDatabase(plugin, name, app);
			res.json(result);
		})
	);

	app.post(
		"/api/databases/:name/unlink",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { plugin, app } = req.body;
			const result = await unlinkDatabase(plugin, name, app);
			res.json(result);
		})
	);

	app.delete(
		"/api/databases/:name",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { plugin, confirmName } = req.body;
			const result = await destroyDatabase(plugin, name, confirmName);
			res.json(result);
		})
	);

	app.post(
		"/api/plugins/install",
		withAuth(async (req, res) => {
			const { repository, name, sudoPassword } = req.body ?? {};
			const result =
				typeof sudoPassword === "string" && sudoPassword.trim().length > 0
					? await installPlugin(repository, name, sudoPassword)
					: await installPlugin(repository, name);
			res.json(result);
		})
	);

	app.get(
		"/api/plugins",
		withAuth(async (_req, res) => {
			const plugins = await getPlugins();
			res.json(plugins);
		})
	);

	app.post(
		"/api/plugins/:name/enable",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { sudoPassword } = req.body ?? {};
			const result =
				typeof sudoPassword === "string" && sudoPassword.trim().length > 0
					? await enablePlugin(name, sudoPassword)
					: await enablePlugin(name);
			res.json(result);
		})
	);

	app.post(
		"/api/plugins/:name/disable",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { sudoPassword } = req.body ?? {};
			const result =
				typeof sudoPassword === "string" && sudoPassword.trim().length > 0
					? await disablePlugin(name, sudoPassword)
					: await disablePlugin(name);
			res.json(result);
		})
	);

	app.delete(
		"/api/plugins/:name",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const { sudoPassword } = req.body ?? {};
			const result =
				typeof sudoPassword === "string" && sudoPassword.trim().length > 0
					? await uninstallPlugin(name, sudoPassword)
					: await uninstallPlugin(name);
			res.json(result);
		})
	);

	app.get(
		"/api/apps/:name/ssl",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const ssl = await getSSL(name);
			res.json(ssl);
		})
	);

	app.post(
		"/api/apps/:name/ssl/enable",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const result = await enableSSL(name);
			res.json(result);
		})
	);

	app.post(
		"/api/apps/:name/ssl/renew",
		withAuth(async (req, res) => {
			const { name } = req.params;
			const result = await renewSSL(name);
			res.json(result);
		})
	);

	app.get("/api/commands", (req, res) => {
		(authMiddleware as (req: Request, res: Response, next: NextFunction) => void)(req, res, () => {
			const limit = Number.parseInt(req.query.limit as string, 10) || 20;
			const commands = getRecentCommands(limit);
			res.json(commands);
		});
	});

	return app;
}

describe("API Routes", () => {
	let app: Express;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(authMiddleware).mockImplementation((_req, _res, next) => next());
		app = createTestApp();
	});

	describe("GET /api/health", () => {
		it("should return ok status", async () => {
			const response = await request(app).get("/api/health");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ status: "ok" });
		});
	});

	describe("POST /api/auth/login", () => {
		it("should return success on valid password", async () => {
			vi.mocked(login).mockReturnValue(true);

			const response = await request(app)
				.post("/api/auth/login")
				.send({ password: "valid-password" });

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: true });
			expect(login).toHaveBeenCalledWith("valid-password");
			expect(setAuthCookie).toHaveBeenCalled();
		});

		it("should return 401 on invalid password", async () => {
			vi.mocked(login).mockReturnValue(false);

			const response = await request(app)
				.post("/api/auth/login")
				.send({ password: "wrong-password" });

			expect(response.status).toBe(401);
			expect(response.body).toEqual({ error: "Invalid password" });
			expect(setAuthCookie).not.toHaveBeenCalled();
		});
	});

	describe("POST /api/auth/logout", () => {
		it("should return success and clear cookie", async () => {
			const response = await request(app).post("/api/auth/logout");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: true });
			expect(clearAuthCookie).toHaveBeenCalled();
		});
	});

	describe("GET /api/auth/me", () => {
		it("should return authenticated status when auth passes", async () => {
			vi.mocked(authMiddleware).mockImplementation((_req, _res, next) => next());

			const response = await request(app).get("/api/auth/me");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ authenticated: true });
		});

		it("should block request when auth fails", async () => {
			vi.mocked(authMiddleware).mockImplementation((_req, res) => {
				res.status(401).json({ error: "Unauthorized" });
			});

			const response = await request(app).get("/api/auth/me");

			expect(response.status).toBe(401);
			expect(response.body).toEqual({ error: "Unauthorized" });
		});
	});

	describe("GET /api/apps", () => {
		it("should return list of apps", async () => {
			const mockApps = [
				{ name: "app1", status: "running", domains: ["example.com"] },
				{ name: "app2", status: "stopped", domains: [] },
			];
			vi.mocked(getApps).mockResolvedValue(mockApps as never);

			const response = await request(app).get("/api/apps");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockApps);
			expect(getApps).toHaveBeenCalled();
		});

		it("should return error status when apps list fails", async () => {
			const errorResponse = {
				error: "Failed to list apps",
				exitCode: 500,
				command: "dokku apps:list",
				stderr: "Error",
			};
			vi.mocked(getApps).mockResolvedValue(errorResponse as never);

			const response = await request(app).get("/api/apps");

			expect(response.status).toBe(500);
			expect(response.body).toEqual(errorResponse);
		});

		it("should return 400 status on validation error", async () => {
			const errorResponse = {
				error: "Invalid input",
				exitCode: 400,
				command: "",
				stderr: "Bad request",
			};
			vi.mocked(getApps).mockResolvedValue(errorResponse as never);

			const response = await request(app).get("/api/apps");

			expect(response.status).toBe(400);
		});
	});

	describe("GET /api/apps/:name", () => {
		it("should return app details", async () => {
			const mockAppDetail = {
				name: "my-app",
				status: "running",
				domains: ["example.com"],
				processes: { web: 1 },
				gitRemote: "git@example.com:my-app.git",
			};
			vi.mocked(getAppDetail).mockResolvedValue(mockAppDetail as never);

			const response = await request(app).get("/api/apps/my-app");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockAppDetail);
			expect(getAppDetail).toHaveBeenCalledWith("my-app");
		});
	});

	describe("POST /api/apps/:name/restart", () => {
		it("should restart app and return result", async () => {
			const mockResult = {
				command: "dokku ps:restart my-app",
				exitCode: 0,
				stdout: "Restarting...",
				stderr: "",
			};
			vi.mocked(restartApp).mockResolvedValue(mockResult as never);

			const response = await request(app).post("/api/apps/my-app/restart");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockResult);
			expect(restartApp).toHaveBeenCalledWith("my-app");
		});
	});

	describe("POST /api/apps/:name/rebuild", () => {
		it("should rebuild app and return result", async () => {
			const mockResult = {
				command: "dokku ps:rebuild my-app",
				exitCode: 0,
				stdout: "Rebuilding...",
				stderr: "",
			};
			vi.mocked(rebuildApp).mockResolvedValue(mockResult as never);

			const response = await request(app).post("/api/apps/my-app/rebuild");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockResult);
			expect(rebuildApp).toHaveBeenCalledWith("my-app");
		});
	});

	describe("POST /api/apps/:name/scale", () => {
		it("should scale app and return result", async () => {
			const mockResult = {
				command: "dokku ps:scale my-app web=2",
				exitCode: 0,
				stdout: "Scaled",
				stderr: "",
			};
			vi.mocked(scaleApp).mockResolvedValue(mockResult as never);

			const response = await request(app)
				.post("/api/apps/my-app/scale")
				.send({ processType: "web", count: 2 });

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockResult);
			expect(scaleApp).toHaveBeenCalledWith("my-app", "web", 2);
		});
	});

	describe("GET /api/commands", () => {
		it("should return recent commands with default limit", async () => {
			const mockCommands = [
				{ id: 1, command: "dokku apps" },
				{ id: 2, command: "dokku ps:report" },
			];
			vi.mocked(getRecentCommands).mockReturnValue(mockCommands as never);

			const response = await request(app).get("/api/commands");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockCommands);
			expect(getRecentCommands).toHaveBeenCalledWith(20);
		});

		it("should return recent commands with custom limit", async () => {
			const mockCommands = [{ id: 1, command: "dokku apps" }];
			vi.mocked(getRecentCommands).mockReturnValue(mockCommands as never);

			const response = await request(app).get("/api/commands?limit=5");

			expect(response.status).toBe(200);
			expect(getRecentCommands).toHaveBeenCalledWith(5);
		});
	});

	describe("Config routes", () => {
		it("GET /api/apps/:name/config - should return config", async () => {
			const mockConfig = { NODE_ENV: "production", PORT: "3000" };
			vi.mocked(getConfig).mockResolvedValue(mockConfig as never);

			const response = await request(app).get("/api/apps/my-app/config");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockConfig);
		});

		it("POST /api/apps/:name/config - should set config value", async () => {
			const mockResult = { key: "NODE_ENV", value: "production" };
			vi.mocked(setConfig).mockResolvedValue(mockResult as never);

			const response = await request(app)
				.post("/api/apps/my-app/config")
				.send({ key: "NODE_ENV", value: "production" });

			expect(response.status).toBe(200);
			expect(setConfig).toHaveBeenCalledWith("my-app", "NODE_ENV", "production");
		});

		it("DELETE /api/apps/:name/config/:key - should unset config", async () => {
			const mockResult = { success: true };
			vi.mocked(unsetConfig).mockResolvedValue(mockResult as never);

			const response = await request(app).delete("/api/apps/my-app/config/NODE_ENV");

			expect(response.status).toBe(200);
			expect(unsetConfig).toHaveBeenCalledWith("my-app", "NODE_ENV");
		});
	});

	describe("Domains routes", () => {
		it("GET /api/apps/:name/domains - should return domains", async () => {
			const mockDomains = ["example.com", "www.example.com"];
			vi.mocked(getDomains).mockResolvedValue(mockDomains as never);

			const response = await request(app).get("/api/apps/my-app/domains");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockDomains);
		});

		it("POST /api/apps/:name/domains - should add domain", async () => {
			const mockResult = { domain: "new-domain.com", added: true };
			vi.mocked(addDomain).mockResolvedValue(mockResult as never);

			const response = await request(app)
				.post("/api/apps/my-app/domains")
				.send({ domain: "new-domain.com" });

			expect(response.status).toBe(200);
			expect(addDomain).toHaveBeenCalledWith("my-app", "new-domain.com");
		});

		it("DELETE /api/apps/:name/domains/:domain - should remove domain", async () => {
			const mockResult = { domain: "old-domain.com", removed: true };
			vi.mocked(removeDomain).mockResolvedValue(mockResult as never);

			const response = await request(app).delete("/api/apps/my-app/domains/old-domain.com");

			expect(response.status).toBe(200);
			expect(removeDomain).toHaveBeenCalledWith("my-app", "old-domain.com");
		});
	});

	describe("Database routes", () => {
		it("GET /api/databases - should return databases", async () => {
			const mockDatabases = [
				{ name: "db1", plugin: "postgres" },
				{ name: "db2", plugin: "mysql" },
			];
			vi.mocked(getDatabases).mockResolvedValue(mockDatabases as never);

			const response = await request(app).get("/api/databases");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockDatabases);
		});

		it("POST /api/databases - should create database", async () => {
			const mockResult = { name: "newdb", plugin: "postgres", created: true };
			vi.mocked(createDatabase).mockResolvedValue(mockResult as never);

			const response = await request(app)
				.post("/api/databases")
				.send({ plugin: "postgres", name: "newdb" });

			expect(response.status).toBe(200);
			expect(createDatabase).toHaveBeenCalledWith("postgres", "newdb");
		});

		it("POST /api/plugins/install - should install plugin", async () => {
			const mockResult = { command: "dokku plugin:install x", exitCode: 0, stdout: "", stderr: "" };
			vi.mocked(installPlugin).mockResolvedValue(mockResult as never);

			const response = await request(app)
				.post("/api/plugins/install")
				.send({ repository: "dokku/dokku-postgres", name: "dokku-postgres" });

			expect(response.status).toBe(200);
			expect(installPlugin).toHaveBeenCalledWith("dokku/dokku-postgres", "dokku-postgres");
		});

		it("POST /api/plugins/install - should pass sudo password when provided", async () => {
			const mockResult = { command: "dokku plugin:install x", exitCode: 0, stdout: "", stderr: "" };
			vi.mocked(installPlugin).mockResolvedValue(mockResult as never);

			const response = await request(app).post("/api/plugins/install").send({
				repository: "dokku/dokku-postgres",
				name: "dokku-postgres",
				sudoPassword: "secret",
			});

			expect(response.status).toBe(200);
			expect(installPlugin).toHaveBeenCalledWith(
				"dokku/dokku-postgres",
				"dokku-postgres",
				"secret"
			);
		});

		it("GET /api/plugins - should list plugins", async () => {
			const mockPlugins = [{ name: "dokku-postgres", enabled: true }];
			vi.mocked(getPlugins).mockResolvedValue(mockPlugins as never);

			const response = await request(app).get("/api/plugins");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockPlugins);
		});

		it("POST /api/plugins/:name/enable - should enable plugin", async () => {
			const mockResult = { command: "dokku plugin:enable dokku-postgres", exitCode: 0 };
			vi.mocked(enablePlugin).mockResolvedValue(mockResult as never);

			const response = await request(app).post("/api/plugins/dokku-postgres/enable");

			expect(response.status).toBe(200);
			expect(enablePlugin).toHaveBeenCalledWith("dokku-postgres");
		});

		it("POST /api/plugins/:name/disable - should disable plugin", async () => {
			const mockResult = { command: "dokku plugin:disable dokku-postgres", exitCode: 0 };
			vi.mocked(disablePlugin).mockResolvedValue(mockResult as never);

			const response = await request(app).post("/api/plugins/dokku-postgres/disable");

			expect(response.status).toBe(200);
			expect(disablePlugin).toHaveBeenCalledWith("dokku-postgres");
		});

		it("DELETE /api/plugins/:name - should uninstall plugin", async () => {
			const mockResult = { command: "dokku plugin:uninstall dokku-postgres", exitCode: 0 };
			vi.mocked(uninstallPlugin).mockResolvedValue(mockResult as never);

			const response = await request(app).delete("/api/plugins/dokku-postgres");

			expect(response.status).toBe(200);
			expect(uninstallPlugin).toHaveBeenCalledWith("dokku-postgres");
		});
	});

	describe("SSL routes", () => {
		it("GET /api/apps/:name/ssl - should return SSL status", async () => {
			const mockSSL = { enabled: true, expiresAt: "2025-01-01" };
			vi.mocked(getSSL).mockResolvedValue(mockSSL as never);

			const response = await request(app).get("/api/apps/my-app/ssl");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockSSL);
		});

		it("POST /api/apps/:name/ssl/enable - should enable SSL", async () => {
			const mockResult = { enabled: true };
			vi.mocked(enableSSL).mockResolvedValue(mockResult as never);

			const response = await request(app).post("/api/apps/my-app/ssl/enable");

			expect(response.status).toBe(200);
			expect(enableSSL).toHaveBeenCalledWith("my-app");
		});

		it("POST /api/apps/:name/ssl/renew - should renew SSL", async () => {
			const mockResult = { renewed: true };
			vi.mocked(renewSSL).mockResolvedValue(mockResult as never);

			const response = await request(app).post("/api/apps/my-app/ssl/renew");

			expect(response.status).toBe(200);
			expect(renewSSL).toHaveBeenCalledWith("my-app");
		});
	});
});
