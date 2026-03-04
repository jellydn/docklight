import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { ITEMS_PER_PAGE } from "../lib/constants.js";

interface UseAuditLogParams<T> {
	fetchUrl: string;
	schema: z.ZodSchema<{ logs: T[]; total: number }>;
	fetchDeps: unknown[];
	filterParams?: string;
}

interface UseAuditLogResult<T> {
	logs: T[];
	total: number;
	loading: boolean;
	error: string | null;
	offset: number;
	setOffset: (offset: number) => void;
	refresh: () => void;
}

export function useAuditLog<T>({
	fetchUrl,
	schema,
	fetchDeps,
	filterParams,
}: UseAuditLogParams<T>): UseAuditLogResult<T> {
	const [offset, setOffset] = useState(0);

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: [...fetchDeps, offset, filterParams],
		queryFn: async () => {
			const params = new URLSearchParams({
				limit: ITEMS_PER_PAGE.toString(),
				offset: offset.toString(),
			});

			// Merge filter params if provided
			if (filterParams) {
				const filterParamsObj = new URLSearchParams(filterParams);
				filterParamsObj.forEach((value, key) => {
					params.append(key, value);
				});
			}

			const separator = fetchUrl.includes("?") ? "&" : "?";
			return apiFetch(`${fetchUrl}${separator}${params.toString()}`, schema);
		},
	});

	return {
		logs: data?.logs ?? [],
		total: data?.total ?? 0,
		loading: isLoading,
		error: error?.message ?? null,
		offset,
		setOffset,
		refresh: () => void refetch(),
	};
}

/**
 * Hook for managing audit logs with filter support
 * @example
 * const { logs, filters, setFilter, resetFilters } = useAuditLogWithFilters({
 *   fetchUrl: "/audit/logs",
 *   schema: AuditLogResultSchema,
 *   fetchDeps: [],
 * });
 * // Initialize filters on component mount
 * useEffect(() => {
 *   if (Object.keys(filters).length === 0) {
 *     resetFilters(defaultFilters);
 *   }
 * }, [filters, resetFilters]);
 */
export function useAuditLogWithFilters<T, F extends Record<string, string>>({
	fetchUrl,
	schema,
	fetchDeps,
}: UseAuditLogParams<T>) {
	const [filters, setFilters] = useState<F>({} as F);
	const [offset, setOffset] = useState(0);

	// Build query string from filters
	const getQueryString = () => {
		const params = new URLSearchParams({
			limit: ITEMS_PER_PAGE.toString(),
			offset: offset.toString(),
		});
		Object.entries(filters).forEach(([key, value]) => {
			if (value) params.append(key, value);
		});
		return params.toString();
	};

	const { logs, total, loading, error, refresh } = useAuditLog({
		fetchUrl: fetchUrl,
		schema,
		fetchDeps: [offset, ...Object.values(filters), ...fetchDeps],
		filterParams: getQueryString(),
	});

	const setFilter = <K extends keyof F>(key: K, value: F[K]) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setOffset(0); // Reset to first page when filter changes
	};

	const resetFilters = (defaultFilters: F) => {
		setFilters(defaultFilters);
		setOffset(0);
	};

	return {
		logs,
		total,
		loading,
		error,
		offset,
		setOffset,
		filters: filters as Readonly<F>,
		setFilter,
		resetFilters,
		refresh,
	};
}
