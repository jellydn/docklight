import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { useToast } from "@/components/ToastProvider.js";
import { apiFetch } from "@/lib/api.js";
import { queryKeys } from "@/lib/query-keys.js";
import type { CommandResult } from "@/lib/schemas.js";

interface UseServerMaintenanceMutationOptions<T extends CommandResult> {
	endpoint: string;
	schema: z.ZodType<T>;
	successMessage: string;
	errorMessage: string;
}

export function useServerMaintenanceMutation<T extends CommandResult>({
	endpoint,
	schema,
	successMessage,
	errorMessage,
}: UseServerMaintenanceMutationOptions<T>) {
	const { addToast } = useToast();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => apiFetch(endpoint, schema, { method: "POST" }),
		onSuccess: () => {
			addToast("success", successMessage);
			void queryClient.invalidateQueries({ queryKey: queryKeys.health });
			void queryClient.invalidateQueries({ queryKey: queryKeys.commands });
		},
		onError: (error: Error) => {
			addToast("error", error.message || errorMessage);
		},
	});
}
