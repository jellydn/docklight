import cookieParser from "cookie-parser";
import express from "express";
import http from "http";
import path from "path";
import pinoHttp from "pino-http";
import { startAuditRotation, stopAuditRotation } from "./lib/audit-rotation.js";
import { authMiddleware } from "./lib/auth.js";
import { logger } from "./lib/logger.js";
import { sshPool } from "./lib/executor.js";
import { setupLogStreaming } from "./lib/websocket.js";
import {
	registerAdminRoutes,
	registerSettingsRoutes,
	registerAppBuildpackRoutes,
	registerAppConfigRoutes,
	registerAppDeploymentRoutes,
	registerAppDockerOptionsRoutes,
	registerAppDomainRoutes,
	registerAppNetworkRoutes,
	registerAppPortRoutes,
	registerAppProxyRoutes,
	registerAppRoutes,
	registerAppSSLRoutes,
	registerAuthRoutes,
	registerCommandRoutes,
	registerDatabaseRoutes,
	registerHealthRoutes,
	registerPluginRoutes,
	registerServerRoutes,
	registerUserRoutes,
} from "./routes/index.js";

const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10_000;

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.set("trust proxy", true);

// HTTPS redirect middleware (production only)
if (process.env.NODE_ENV === "production") {
	app.use((req, res, next) => {
		const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";

		if (!isSecure) {
			return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
		}

		next();
	});
}

app.use(pinoHttp({ logger }));

// Serve static files from client
app.use(express.static(CLIENT_DIST));

// Register routes
registerHealthRoutes(app);

// Auth routes (no middleware - public endpoints with internal rate limiting)
registerAuthRoutes(app);

// Protected routes (require authentication)
app.use("/api", authMiddleware);
registerUserRoutes(app);
registerCommandRoutes(app);
registerAppRoutes(app);
registerAppConfigRoutes(app);
registerAppDomainRoutes(app);
registerAppPortRoutes(app);
registerAppProxyRoutes(app);
registerAppBuildpackRoutes(app);
registerAppDockerOptionsRoutes(app);
registerAppNetworkRoutes(app);
registerAppDeploymentRoutes(app);
registerAppSSLRoutes(app);
registerDatabaseRoutes(app);
registerPluginRoutes(app);
registerServerRoutes(app);
registerAdminRoutes(app);
registerSettingsRoutes(app);

// SPA fallback for client-side routing (must be after all API routes)
app.get("/{*path}", (_req, res) => {
	res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

// Create server and setup WebSocket
const server = http.createServer(app);
setupLogStreaming(server);

server.listen(PORT, () => {
	logger.info(`Docklight server running on port ${PORT}`);
	startAuditRotation();
});

// Graceful shutdown handler
let isShuttingDown = false;

function shutdown(signal: string): void {
	if (isShuttingDown) return;
	isShuttingDown = true;

	logger.info({ signal }, "Received shutdown signal, stopping server gracefully...");

	stopAuditRotation();
	sshPool.closeAll();

	const forceShutdownTimeout = setTimeout(() => {
		logger.warn("Forcing shutdown after timeout");
		process.exit(1);
	}, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
	forceShutdownTimeout.unref();

	server.close((err?: Error) => {
		clearTimeout(forceShutdownTimeout);
		if (err) {
			logger.error({ err }, "Error while closing HTTP server");
			process.exit(1);
			return;
		}
		logger.info("HTTP server closed");
		process.exit(0);
	});
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
