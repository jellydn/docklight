import { z } from "zod";

/**
 * Zod schemas for validating API responses
 * Ensures type safety at runtime and provides clear error messages
 */

// Primitive types
const AppStatusSchema = z.enum(["running", "stopped"]);

// Command result schema
export const CommandResultSchema = z.object({
	command: z.string(),
	exitCode: z.number(),
	stdout: z.string(),
	stderr: z.string(),
});

export type CommandResult = z.infer<typeof CommandResultSchema>;

// API Error schema
export const ApiErrorSchema = z.object({
	error: z.string(),
	command: z.string().optional(),
	exitCode: z.number().optional(),
	stderr: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// Server health schema
export const ServerHealthSchema = z.object({
	cpu: z.number(),
	memory: z.number(),
	disk: z.number(),
});

export type ServerHealth = z.infer<typeof ServerHealthSchema>;

// App schema
export const AppSchema = z.object({
	name: z.string(),
	status: AppStatusSchema,
	domains: z.array(z.string()),
	lastDeployTime: z.string().datetime({ message: "Invalid datetime string" }).optional(),
});

export type App = z.infer<typeof AppSchema>;

// Command history schema
export const CommandHistorySchema = z.object({
	id: z.number(),
	command: z.string(),
	exitCode: z.number(),
	stdout: z.string(),
	stderr: z.string(),
	createdAt: z.string(),
});

export type CommandHistory = z.infer<typeof CommandHistorySchema>;

// App detail schema
export const AppDetailSchema = z.object({
	name: z.string(),
	status: AppStatusSchema,
	gitRemote: z.string(),
	domains: z.array(z.string()),
	processes: z.record(z.string(), z.number()),
});

export type AppDetail = z.infer<typeof AppDetailSchema>;

// SSL status schema
export const SSLStatusSchema = z.object({
	active: z.boolean(),
	expiryDate: z.string().datetime({ message: "Invalid datetime string" }).optional(),
	certProvider: z.string().optional(),
});

export type SSLStatus = z.infer<typeof SSLStatusSchema>;

// Config vars schema
export const ConfigVarsSchema = z.record(z.string(), z.string());

export type ConfigVars = z.infer<typeof ConfigVarsSchema>;

// Database schema
export const DatabaseSchema = z.object({
	name: z.string(),
	plugin: z.string(),
	linkedApps: z.array(z.string()),
	connectionInfo: z.string(),
});

export type Database = z.infer<typeof DatabaseSchema>;

// Plugin info schema
export const PluginInfoSchema = z.object({
	name: z.string(),
	enabled: z.boolean(),
	version: z.string().optional(),
});

export type PluginInfo = z.infer<typeof PluginInfoSchema>;

// App creation result schema
export const CreateAppResultSchema = z.object({
	success: z.boolean(),
	name: z.string(),
});

export type CreateAppResult = z.infer<typeof CreateAppResultSchema>;

// Port mapping schema
export const PortMappingSchema = z.object({
	scheme: z.string(),
	hostPort: z.number(),
	containerPort: z.number(),
});

export type PortMapping = z.infer<typeof PortMappingSchema>;

// Ports response schema
export const PortsResponseSchema = z.object({
	ports: z.array(PortMappingSchema),
});

export type PortsResponse = z.infer<typeof PortsResponseSchema>;

// Proxy report schema
export const ProxyReportSchema = z.object({
	enabled: z.boolean(),
	type: z.string(),
});

export type ProxyReport = z.infer<typeof ProxyReportSchema>;

// Buildpack schema
export const BuildpackSchema = z.object({
	index: z.number(),
	url: z.string(),
});

export type Buildpack = z.infer<typeof BuildpackSchema>;

// Buildpacks response schema
export const BuildpacksResponseSchema = z.object({
	buildpacks: z.array(BuildpackSchema),
});

export type BuildpacksResponse = z.infer<typeof BuildpacksResponseSchema>;

// Docker options schema
export const DockerOptionsSchema = z.object({
	build: z.array(z.string()),
	deploy: z.array(z.string()),
	run: z.array(z.string()),
});

export type DockerOptions = z.infer<typeof DockerOptionsSchema>;

// Network report schema
export const NetworkReportSchema = z.record(z.string(), z.string());

export type NetworkReport = z.infer<typeof NetworkReportSchema>;

// Deployment settings schema
export const DeploymentSettingsSchema = z.object({
	deployBranch: z.string(),
	buildDir: z.string(),
	builder: z.string(),
});

export type DeploymentSettings = z.infer<typeof DeploymentSettingsSchema>;

// User role
export const UserRoleSchema = z.enum(["admin", "operator", "viewer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

// User schema (safe, no password hash)
export const UserSchema = z.object({
	id: z.number(),
	username: z.string(),
	role: UserRoleSchema,
	createdAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

// Auth me response
export const AuthMeSchema = z.object({
	authenticated: z.literal(true),
	user: z
		.object({
			id: z.number(),
			username: z.string(),
			role: UserRoleSchema,
		})
		.optional(),
});
