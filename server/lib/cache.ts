/**
 * Simple in-memory cache with TTL support
 */

const CACHE_TTL = Number.parseInt(process.env.CACHE_TTL ?? "30000", 10);

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function isExpired(entry: CacheEntry<unknown>): boolean {
	return Date.now() > entry.expiresAt;
}

/**
 * Get a value from the cache. Returns undefined if not found or expired.
 */
export function get<T>(key: string): T | undefined {
	const entry = cache.get(key);
	if (!entry) {
		return undefined;
	}

	if (isExpired(entry)) {
		cache.delete(key);
		return undefined;
	}

	return entry.value as T;
}

/**
 * Set a value in the cache with TTL.
 */
export function set<T>(key: string, value: T, ttl: number = CACHE_TTL): void {
	const expiresAt = Date.now() + ttl;
	cache.set(key, { value, expiresAt });
}

/**
 * Delete a specific key from the cache.
 */
export function del(key: string): void {
	cache.delete(key);
}

/**
 * Clear all entries from the cache.
 */
export function clear(): void {
	cache.clear();
}

/**
 * Clear multiple keys matching a prefix.
 */
export function clearPrefix(prefix: string): void {
	for (const key of cache.keys()) {
		if (key.startsWith(prefix)) {
			cache.delete(key);
		}
	}
}

/**
 * Get cache statistics (useful for debugging).
 */
export function getStats(): { size: number; keys: string[] } {
	// Clean expired entries first
	for (const [key, entry] of cache.entries()) {
		if (isExpired(entry)) {
			cache.delete(key);
		}
	}

	return {
		size: cache.size,
		keys: [...cache.keys()],
	};
}
