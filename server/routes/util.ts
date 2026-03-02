import type express from "express";
import type { CommandResult } from "../lib/executor.js";
import { insertAuditLog } from "../lib/db.js";

export type CommandResultLike =
	| CommandResult
	| {
			error: string;
			exitCode: number;
			command?: string;
			stdout?: string;
			stderr?: string;
	  };

/**
 * Handles command result responses with proper status codes
 * @returns true if successful, false if error was sent
 */
export function handleCommandResult(res: express.Response, result: CommandResultLike): boolean {
	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return false;
	}
	return true;
}

/**
 * Gets a string parameter from Express request params
 * Express params can be string | string[], this ensures we always get a string
 */
export function getParam(params: unknown, key: string): string {
	const value = (params as Record<string, unknown>)[key];
	if (Array.isArray(value)) return value[0] ?? "";
	return (value as string | undefined) ?? "";
}

/**
 * Gets an optional string parameter from Express request params
 */
export function getOptionalParam(params: unknown, key: string): string | undefined {
	const value = (params as Record<string, unknown>)[key];
	if (Array.isArray(value)) return value[0];
	return value as string | undefined;
}

/**
 * Gets the IP address from the request, checking common proxy headers
 * Only trusts X-Forwarded-For and X-Real-IP headers if request is from a trusted proxy
 */
export function getIpAddress(req: express.Request): string | undefined {
	const trustProxy = req.app?.get("trust proxy") as boolean | undefined;
	const remoteAddress = req.socket?.remoteAddress;

	const isTrustedProxy =
		trustProxy === true ||
		(remoteAddress &&
			(remoteAddress.startsWith("127.") ||
				remoteAddress.startsWith("10.") ||
				remoteAddress.startsWith("192.168.") ||
				remoteAddress.startsWith("172.16.") ||
				remoteAddress.startsWith("172.17.") ||
				remoteAddress.startsWith("172.18.") ||
				remoteAddress.startsWith("172.19.") ||
				remoteAddress.startsWith("172.2") ||
				remoteAddress.startsWith("172.30.") ||
				remoteAddress.startsWith("172.31.")));

	if (isTrustedProxy) {
		return (
			(req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ||
			(req.headers["x-real-ip"] as string | undefined) ||
			remoteAddress
		);
	}

	return remoteAddress;
}

/**
 * Logs an audit event for user actions
 * @param req - Express request object (must have user attached by authMiddleware)
 * @param action - Action name (e.g., "app:create", "user:update")
 * @param resource - Resource identifier (e.g., app name, username)
 * @param details - Additional details object (will be JSON stringified)
 */
export function auditLog(
	req: express.Request,
	action: string,
	resource: string | null = null,
	details: Record<string, unknown> | null = null
): void {
	insertAuditLog(
		req.user?.userId ?? null,
		action,
		resource,
		details ? JSON.stringify(details) : null,
		getIpAddress(req)
	);
}
