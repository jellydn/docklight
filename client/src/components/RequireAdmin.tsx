import type { ReactNode, JSX } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context.js";

type RequireAdminProps = {
	children: ReactNode;
};

export function RequireAdmin({ children }: RequireAdminProps): JSX.Element {
	const { role, loading } = useAuth();

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-500">Loading…</div>
			</div>
		);
	}

	if (role !== "admin") {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
