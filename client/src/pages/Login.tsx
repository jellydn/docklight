import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { Button } from "@/components/ui/button";
import { queryKeys } from "../lib/query-keys.js";
import { AuthMeSchema } from "../lib/schemas.js";

export function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();

	const { data: authData, isLoading } = useQuery({
		queryKey: queryKeys.auth.me,
		queryFn: () => apiFetch("/auth/me", AuthMeSchema),
		retry: false,
	});

	useEffect(() => {
		if (authData?.user) {
			navigate("/dashboard");
		}
	}, [authData, navigate]);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");

		try {
			await apiFetch("/auth/login", z.object({ success: z.literal(true) }), {
				method: "POST",
				body: JSON.stringify({ username, password }),
			});
			navigate("/dashboard");
		} catch (err) {
			const message = err instanceof Error ? err.message : "";
			if (message.includes("Too many login attempts")) {
				setError(message);
			} else {
				setError("Invalid credentials");
			}
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background px-4">
				<div className="text-muted-foreground">Loading…</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="bg-card p-8 rounded-lg border border-border w-full max-w-sm">
				<div className="flex justify-center mb-4">
					<img src="/logo.svg" alt="Docklight logo" className="h-12 w-12" />
				</div>
				<h1 className="text-2xl font-bold mb-6 text-center">Docklight Login</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="username" className="block text-sm font-medium mb-2">
							Username
						</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full px-3 py-2 border border-border rounded-md"
							required
							autoComplete="username"
						/>
					</div>
					<div>
						<label htmlFor="password" className="block text-sm font-medium mb-2">
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 border border-border rounded-md"
							required
							autoComplete="current-password"
						/>
					</div>
					{error && <div className="text-destructive text-sm">{error}</div>}
					<Button type="submit" className="w-full">
						Login
					</Button>
				</form>
			</div>
		</div>
	);
}
