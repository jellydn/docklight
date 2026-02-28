import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { AuthModeSchema } from "../lib/schemas.js";

export function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [multiUser, setMultiUser] = useState<boolean | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				await apiFetch("/auth/me");
				navigate("/dashboard");
			} catch {}
		};
		checkAuth();

		const checkMode = async () => {
			try {
				const result = await apiFetch("/auth/mode", AuthModeSchema);
				setMultiUser(result.multiUser);
			} catch {
				setMultiUser(false);
			}
		};
		checkMode();
	}, [navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		try {
			const body = multiUser ? { username, password } : { password };
			await apiFetch("/auth/login", z.object({ success: z.literal(true) }), {
				method: "POST",
				body: JSON.stringify(body),
			});
			navigate("/dashboard");
		} catch (_err) {
			setError(multiUser ? "Invalid credentials" : "Invalid password");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
			<div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
				<div className="flex justify-center mb-4">
					<img src="/logo.svg" alt="Docklight logo" className="h-12 w-12" />
				</div>
				<h1 className="text-2xl font-bold mb-6 text-center">Docklight Login</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					{multiUser && (
						<div>
							<label htmlFor="username" className="block text-sm font-medium mb-2">
								Username
							</label>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
								required
								autoComplete="username"
							/>
						</div>
					)}
					<div>
						<label htmlFor="password" className="block text-sm font-medium mb-2">
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 border rounded-md"
							required
							autoComplete="current-password"
						/>
					</div>
					{error && <div className="text-red-600 text-sm">{error}</div>}
					<button
						type="submit"
						className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
					>
						Login
					</button>
				</form>
			</div>
		</div>
	);
}
