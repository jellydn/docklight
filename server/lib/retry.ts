import { logger } from "./logger.js";

export interface RetryOptions {
	maxRetries?: number;
	baseDelay?: number;
}

/**
 * Retries an async function with exponential backoff.
 * Logs retry attempts for debugging.
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function or throws the last error
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const { maxRetries = 3, baseDelay = 100 } = options;
	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt < maxRetries) {
				const delay = baseDelay * 2 ** attempt;
				logger.warn({ attempt, delay, error }, "Operation failed, retrying...");
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	throw lastError;
}
