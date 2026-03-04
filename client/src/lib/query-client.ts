import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 300000,
			retry: 1,
			refetchOnWindowFocus: true,
		},
	},
});
