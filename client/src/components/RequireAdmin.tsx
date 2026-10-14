import type { ReactNode, JSX } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context.js";
import type { Permission } from "@/lib/schemas.js";

type RequireAdminProps = {
	children: ReactNode;
	resource?: Permission["resource"];
};

export function RequireAdmin({ children, resource }: RequireAdminProps): JSX.Element {
	const { role, loading, canAccessSome } = useAuth();

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading…</div>
			</div>
		);
	}

	if (role !== "admin" && (!resource || !canAccessSome(resource, "read"))) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
