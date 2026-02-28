import { ZodError, type ZodSchema } from "zod";
import { logger } from "./logger.js";
import type { ApiError } from "./schemas.js";

const API_BASE = "/api";

// Re-export ApiError for backwards compatibility
export type { ApiError } from "./schemas.js";

/**
 * Validation error thrown when response doesn't match schema
 */
export class ValidationError extends Error {
	public readonly zodError: ZodError<unknown>;

	constructor(zodError: ZodError<unknown>, message: string) {
		super(message);
		this.name = "ValidationError";
		this.zodError = zodError;
	}
}

/**
 * Fetch from API with optional zod schema validation
 *
 * @param path - API path (will be prefixed with /api)
 * @param schema - Optional zod schema to validate response against
 * @param options - RequestInit options for fetch
 * @returns Parsed and validated response data
 * @throws {Error} HTTP errors or validation errors
 */
export async function apiFetch<T>(
	path: string,
	schema?: ZodSchema<T>,
	options?: RequestInit
): Promise<T> {
	const url = `${API_BASE}${path}`;

	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
		credentials: "include",
	});

	if (response.status === 401) {
		if (window.location.pathname !== "/login") {
			window.location.href = "/login";
		}
		throw new Error("Unauthorized");
	}

	if (!response.ok) {
		const error: ApiError = await response.json();
		const details = [error.stderr, error.command].filter(Boolean).join(" | ");
		const message = details ? `${error.error || "Request failed"}: ${details}` : error.error;
		throw new Error(message || "Request failed");
	}

	const data = await response.json();

	// Validate against schema if provided
	if (schema) {
		try {
			return schema.parse(data);
		} catch (err) {
			if (err instanceof ZodError) {
				const errorDetails = err.issues
					.map((issue) => {
						const path = issue.path.join(".");
						return `${path}: ${issue.message}`;
					})
					.join(", ");

				logger.error({ zodError: err, url }, `API response validation failed: ${errorDetails}`);

				throw new ValidationError(
					err,
					`API response validation failed for ${path}: ${errorDetails}`
				);
			}
			throw err;
		}
	}

	return data as T;
}
