import { createContext, useContext, type ReactNode, type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api.js";
import { AuthMeSchema } from "@/lib/schemas.js";
import type { UserRole } from "@/lib/schemas.js";
import { queryKeys } from "@/lib/query-keys.js";

interface AuthContextValue {
	role: UserRole | null;
	username: string | null;
	loading: boolean;
	canModify: boolean;
}

const AuthContext = createContext<AuthContextValue>({
	role: null,
	username: null,
	loading: true,
	canModify: false,
});

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
	const { data: authData, isLoading } = useQuery({
		queryKey: queryKeys.auth.me,
		queryFn: () => apiFetch("/auth/me", AuthMeSchema),
		retry: false,
	});

	const role = authData?.user?.role ?? null;
	const username = authData?.user?.username ?? null;
	const canModify = role === "admin" || role === "operator";

	return (
		<AuthContext.Provider value={{ role, username, loading: isLoading, canModify }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	return useContext(AuthContext);
}
