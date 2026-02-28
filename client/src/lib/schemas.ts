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
