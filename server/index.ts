import cookieParser from "cookie-parser";
import express from "express";
import http from "http";
import path from "path";
import pinoHttp from "pino-http";
import { authMiddleware } from "./lib/auth.js";
import { logger } from "./lib/logger.js";
import { setupLogStreaming } from "./lib/websocket.js";
import {
	registerHealthRoutes,
	registerAuthRoutes,
	registerUserRoutes,
	registerCommandRoutes,
	registerAppRoutes,
	registerAppConfigRoutes,
	registerAppDomainRoutes,
	registerAppPortRoutes,
	registerAppProxyRoutes,
	registerAppBuildpackRoutes,
	registerAppDockerOptionsRoutes,
	registerAppNetworkRoutes,
	registerAppDeploymentRoutes,
	registerAppSSLRoutes,
	registerDatabaseRoutes,
	registerPluginRoutes,
	registerServerRoutes,
	registerAdminRoutes,
} from "./routes/index.js";

const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.set("trust proxy", true);
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

// SPA fallback for client-side routing (must be after all API routes)
app.get("/{*path}", (_req, res) => {
	res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

// Create server and setup WebSocket
const server = http.createServer(app);
setupLogStreaming(server);

server.listen(PORT, () => {
	logger.info(`Docklight server running on port ${PORT}`);
});
