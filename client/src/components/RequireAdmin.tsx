import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { AuthMeSchema } from "../lib/schemas.js";

type RequireAdminProps = {
	children: ReactNode;
};

type AdminState = { status: "loading" } | { status: "authorized" } | { status: "unauthorized" };

export function RequireAdmin({ children }: RequireAdminProps) {
	const [state, setState] = useState<AdminState>({ status: "loading" });

	useEffect(() => {
		const checkAdmin = async () => {
			try {
				const data = await apiFetch("/auth/me", AuthMeSchema);
				setState(
					data.user?.role === "admin" ? { status: "authorized" } : { status: "unauthorized" }
				);
			} catch {
				setState({ status: "unauthorized" });
			}
		};
		checkAdmin();
	}, []);

	if (state.status === "loading") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-500">Loading…</div>
			</div>
		);
	}

	if (state.status === "unauthorized") {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
