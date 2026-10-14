import { createContext, type ReactNode, type JSX, use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api.js";
import { AuthMeSchema } from "@/lib/schemas.js";
import type { UserRole } from "@/lib/schemas.js";
import type { Permission } from "@/lib/schemas.js";
import { queryKeys } from "@/lib/query-keys.js";

interface AuthContextValue {
	role: UserRole | null;
	username: string | null;
	loading: boolean;
	canModify: boolean;
	canCreateApp: boolean;
	canModifyApp: (name: string) => boolean;
	canDeleteApp: (name: string) => boolean;
	canAccess: (
		resource: Permission["resource"],
		action: Permission["action"],
		scope?: string | null
	) => boolean;
	canAccessSome: (resource: Permission["resource"], action: Permission["action"]) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
	role: null,
	username: null,
	loading: true,
	canModify: false,
	canCreateApp: false,
	canModifyApp: () => false,
	canDeleteApp: () => false,
	canAccess: () => false,
	canAccessSome: () => false,
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
		const permissions = authData?.user?.permissions ?? appPermissions;
		const canAccess = (
			resource: Permission["resource"],
			action: Permission["action"],
			scope: string | null = null
		): boolean => {
			if (role === "admin") return true;
			if (!role) return false;
			const rules = permissions.filter(
				(item) => item.resource === resource && item.action === action
			);
			const rule =
				rules.find((item) => item.scope === scope) ?? rules.find((item) => item.scope === null);
			if (rule) return rule.effect === "allow";
			if (resource === "config" || resource === "users") return false;
			return action === "read" || role === "operator";
		};
		const canAccessSome = (
			resource: Permission["resource"],
			action: Permission["action"]
		): boolean =>
			canAccess(resource, action) ||
			permissions.some(
				(item) => item.resource === resource && item.action === action && item.effect === "allow"
			);
		return {
			role,
			username: authData?.user?.username ?? null,
			loading: isLoading,
			canModify: role === "admin" || role === "operator",
			canCreateApp: canAccess("apps", "create"),
			canModifyApp: (name: string): boolean => canAccess("apps", "update", name),
			canDeleteApp: (name: string): boolean => canAccess("apps", "delete", name),
			canAccess,
			canAccessSome,
		};
	}, [authData?.user, isLoading]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	return use(AuthContext);
}
