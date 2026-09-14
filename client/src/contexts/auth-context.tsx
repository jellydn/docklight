import { createContext, type ReactNode, type JSX, use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api.js";
import { AuthMeSchema } from "@/lib/schemas.js";
import type { UserRole } from "@/lib/schemas.js";
import type { AppPermission } from "@/lib/schemas.js";
import { queryKeys } from "@/lib/query-keys.js";

interface AuthContextValue {
	role: UserRole | null;
	username: string | null;
	loading: boolean;
	canModify: boolean;
	canCreateApp: boolean;
	canModifyApp: (name: string) => boolean;
	canDeleteApp: (name: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
	role: null,
	username: null,
	loading: true,
	canModify: false,
	canCreateApp: false,
	canModifyApp: () => false,
	canDeleteApp: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
	const { data: authData, isLoading } = useQuery({
		queryKey: queryKeys.auth.me,
		queryFn: () => apiFetch("/auth/me", AuthMeSchema),
		retry: false,
	});

	const value = useMemo(() => {
		const role = authData?.user?.role ?? null;
		const appPermissions = authData?.user?.appPermissions ?? [];
		const canUseAppPermission = (
			action: AppPermission["action"],
			scope: string | null
		): boolean => {
			if (role === "admin") return true;
			const permission =
				appPermissions.find((item) => item.action === action && item.scope === scope) ??
				appPermissions.find((item) => item.action === action && item.scope === null);
			return permission ? permission.effect === "allow" : role === "operator";
		};
		return {
			role,
			username: authData?.user?.username ?? null,
			loading: isLoading,
			canModify: role === "admin" || role === "operator",
			canCreateApp: canUseAppPermission("create", null),
			canModifyApp: (name: string): boolean => canUseAppPermission("update", name),
			canDeleteApp: (name: string): boolean => canUseAppPermission("delete", name),
		};
	}, [authData?.user, isLoading]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	return use(AuthContext);
}
