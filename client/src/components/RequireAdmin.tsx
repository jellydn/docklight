import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { AuthMeSchema } from "../lib/schemas.js";

type RequireAdminProps = {
	children: React.ReactNode;
};

export function RequireAdmin({ children }: RequireAdminProps) {
	const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const checkAdmin = async () => {
			try {
				const data = await apiFetch("/auth/me", AuthMeSchema);
				setIsAdmin(data.user?.role === "admin");
			} catch {
				setIsAdmin(false);
			} finally {
				setLoading(false);
			}
		};
		checkAdmin();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-500">Loading…</div>
			</div>
		);
	}

	if (!isAdmin) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
