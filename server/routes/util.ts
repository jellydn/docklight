import type express from "express";
import type { CommandResult } from "../lib/executor.js";
import { insertAuditLog } from "../lib/db.js";
import { logger } from "../lib/logger.js";

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
 * Converts an exit code to an appropriate HTTP status code
 * Returns the exit code if it's in the 4xx-5xx range, otherwise returns 500
 */
export function getStatusCode(exitCode: number): number {
	return exitCode >= 400 && exitCode < 600 ? exitCode : 500;
}

/**
 * Handles command result responses with proper status codes
 * @returns true if successful, false if error was sent
 */
export function handleCommandResult(res: express.Response, result: CommandResultLike): boolean {
	if (result.exitCode !== 0) {
		res.status(getStatusCode(result.exitCode)).json(result);
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
				(remoteAddress.startsWith("172.") &&
					// Only match 172.16.0.0 - 172.31.255.255 (RFC 1918 private range)
					(() => {
						const parts = remoteAddress.split(".");
						if (parts.length !== 4) return false;
						const second = parseInt(parts[1], 10);
						return second >= 16 && second <= 31;
					})())));

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

/**
 * Safely logs an audit event, catching and logging any errors
 * @param req - Express request object (must have user attached by authMiddleware)
 * @param action - Action name (e.g., "app:create", "user:update")
 * @param resource - Resource identifier (e.g., app name, username)
 * @param details - Additional details object (will be JSON stringified)
 */
export function safeAuditLog(
	req: express.Request,
	action: string,
	resource: string | null = null,
	details: Record<string, unknown> | null = null
): void {
	try {
		auditLog(req, action, resource, details);
	} catch (error: unknown) {
		logger.error({ err: error as Error, action }, "Failed to write audit log");
	}
}

/**
 * Logs an audit event with a specific userId, bypassing req.user lookup
 * Useful for actions where the userId is known but may not be in req.user (e.g., login)
 */
export function safeAuditLogWithUserId(
	req: express.Request,
	userId: number | null,
	action: string,
	resource: string | null = null,
	details: Record<string, unknown> | null = null
): void {
	try {
		insertAuditLog(
			userId,
			action,
			resource,
			details ? JSON.stringify(details) : null,
			getIpAddress(req)
		);
	} catch (error: unknown) {
		logger.error({ err: error as Error, action, userId }, "Failed to write audit log");
	}
}
