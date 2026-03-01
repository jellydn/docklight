import { createContext, useContext, useEffect, useState, type ReactNode, type JSX } from "react";
import { apiFetch } from "@/lib/api.js";
import { AuthMeSchema } from "@/lib/schemas.js";
import type { UserRole } from "@/lib/schemas.js";

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
	const [role, setRole] = useState<UserRole | null>(null);
	const [username, setUsername] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchMe = async (): Promise<void> => {
			try {
				const data = await apiFetch("/auth/me", AuthMeSchema);
				setRole(data.user?.role ?? null);
				setUsername(data.user?.username ?? null);
			} catch {
				setRole(null);
				setUsername(null);
			} finally {
				setLoading(false);
			}
		};
		fetchMe();
	}, []);

	const canModify = role === "admin" || role === "operator";

	return (
		<AuthContext.Provider value={{ role, username, loading, canModify }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	return useContext(AuthContext);
}
