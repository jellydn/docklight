import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../lib/api.js";
import { AuthMeSchema } from "../lib/schemas.js";
import type { UserRole } from "../lib/schemas.js";

interface AuthContextValue {
	role: UserRole | null;
	loading: boolean;
	canModify: boolean;
}

const AuthContext = createContext<AuthContextValue>({
	role: null,
	loading: true,
	canModify: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
	const [role, setRole] = useState<UserRole | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchMe = async () => {
			try {
				const data = await apiFetch("/auth/me", AuthMeSchema);
				setRole(data.user?.role ?? null);
			} catch {
				setRole(null);
			} finally {
				setLoading(false);
			}
		};
		fetchMe();
	}, []);

	const canModify = role === "admin" || role === "operator";

	return (
		<AuthContext.Provider value={{ role, loading, canModify }}>{children}</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	return useContext(AuthContext);
}
