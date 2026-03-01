import type express from "express";
import type { CommandResult } from "../lib/executor.js";

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
	if (Array.isArray(value)) {
		return value[0] ?? "";
	}
	return (value as string) ?? "";
}

/**
 * Gets an optional string parameter from Express request params
 */
export function getOptionalParam(params: unknown, key: string): string | undefined {
	const value = (params as Record<string, unknown>)[key];
	if (Array.isArray(value)) {
		return value[0];
	}
	return value as string | undefined;
}
