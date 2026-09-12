import { useState, type FormEvent, type JSX } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { Button } from "@/components/ui/button";
import { useToast } from "../components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeToggle.js";

export function ResetPassword(): JSX.Element {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [searchParams] = useSearchParams();
	const { addToast } = useToast();
	const navigate = useNavigate();

	const token = searchParams.get("token") || "";

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");

		if (!token) {
			setError("Missing password reset token. Please request a new reset link.");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setIsPending(true);
		try {
			await apiFetch("/auth/reset-password", z.object({ success: z.literal(true) }), {
				method: "POST",
				body: JSON.stringify({ token, password }),
			});
			addToast("success", "Password has been reset successfully. You can now login.");
			navigate("/login");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to reset password";
			setError(message);
			addToast("error", message);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative">
			<div className="absolute top-4 right-4">
				<ThemeToggle variant="header" />
			</div>
			<div className="bg-card p-6 sm:p-8 rounded-lg border border-border w-full max-w-sm">
				<div className="flex justify-center mb-4">
					<img src="/logo.svg" alt="Docklight logo" className="h-12 w-12" />
				</div>
				<h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>

				{!token ? (
					<div className="space-y-4">
						<div className="text-destructive text-sm text-center">
							Missing or invalid password reset token. Please request a new link from the login
							page.
						</div>
						<Button onClick={() => navigate("/login")} className="w-full">
							Back to login
						</Button>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label htmlFor="password" className="block text-sm font-medium mb-2">
								New Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-3 py-2 border border-border rounded-md"
								required
								autoComplete="new-password"
							/>
						</div>
						<div>
							<label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
								Confirm New Password
							</label>
							<input
								id="confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full px-3 py-2 border border-border rounded-md"
								required
								autoComplete="new-password"
							/>
						</div>
						{error && <div className="text-destructive text-sm">{error}</div>}
						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Resetting…" : "Reset password"}
						</Button>
						<div className="mt-4 border-t border-border pt-4 text-center">
							<button
								type="button"
								onClick={() => navigate("/login")}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Back to login
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
