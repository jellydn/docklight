import { useEffect, useState, type FormEvent, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { Button } from "@/components/ui/button";
import { queryKeys } from "../lib/query-keys.js";
import { AuthMeSchema } from "../lib/schemas.js";
import { useToast } from "../components/ToastProvider";

const FORGOT_PASSWORD_SCHEMA = z.object({
	success: z.literal(true),
	resetToken: z.string().optional(),
	resetUrl: z.string().optional(),
});

export function Login(): JSX.Element {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [mode, setMode] = useState<"login" | "forgot-password">("login");
	const [resetEmail, setResetEmail] = useState("");
	const { addToast } = useToast();
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

	const handleForgotPassword = async (e: FormEvent): Promise<void> => {
		e.preventDefault();

		try {
			await apiFetch("/auth/forgot-password", FORGOT_PASSWORD_SCHEMA, {
				method: "POST",
				body: JSON.stringify({ email: resetEmail }),
			});
			addToast("success", "If the email exists, a password reset link has been sent.");
			setMode("login");
		} catch (err: unknown) {
			const error = err as { message?: string };
			addToast("error", error.message ?? "Failed to request reset");
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

				{mode === "login" ? (
					<>
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
						<div className="mt-4 border-t border-border pt-4 text-center">
							<button
								type="button"
								onClick={() => {
									setMode("forgot-password");
									setError("");
								}}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Forgot password?
							</button>
						</div>
					</>
				) : (
					<>
						<h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
						<form onSubmit={handleForgotPassword} className="space-y-4">
							<div>
								<label htmlFor="reset-email" className="block text-sm font-medium mb-2">
									Email
								</label>
								<input
									id="reset-email"
									type="email"
									value={resetEmail}
									onChange={(e) => setResetEmail(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-md"
									required
									autoComplete="email"
								/>
							</div>
							<Button type="submit" variant="secondary" className="w-full">
								Send reset link
							</Button>
						</form>
						<div className="mt-4 border-t border-border pt-4 text-center">
							<button
								type="button"
								onClick={() => {
									setMode("login");
									setError("");
								}}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Back to login
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
