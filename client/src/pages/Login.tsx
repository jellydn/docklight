import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";

export function Login() {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				await apiFetch("/auth/me");
				navigate("/dashboard");
			} catch {}
		};
		checkAuth();
	}, [navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		try {
			await apiFetch("/auth/login", z.object({ success: z.literal(true) }), {
				method: "POST",
				body: JSON.stringify({ password }),
			});
			navigate("/dashboard");
		} catch (_err) {
			setError("Invalid password");
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
