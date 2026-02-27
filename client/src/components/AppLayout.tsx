import { Link, Outlet, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { logger } from "../lib/logger";

export function AppLayout() {
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			await apiFetch("/auth/logout", {
				method: "POST",
			});
			navigate("/login");
		} catch (err) {
			logger.error({ err }, "Logout failed");
		}
	};

	return (
		<div className="flex min-h-screen bg-gray-100">
			<aside className="w-64 bg-gray-900 text-white">
				<div className="p-4">
					<h1 className="text-xl font-bold">Docklight</h1>
				</div>
				<nav className="mt-4">
					<Link to="/dashboard" className="block px-4 py-2 hover:bg-gray-800">
						Dashboard
					</Link>
					<Link to="/apps" className="block px-4 py-2 hover:bg-gray-800">
						Apps
					</Link>
					<Link to="/databases" className="block px-4 py-2 hover:bg-gray-800">
						Databases
					</Link>
					<Link to="/plugins" className="block px-4 py-2 hover:bg-gray-800">
						Plugins
					</Link>
					<button
						onClick={handleLogout}
						className="w-full text-left px-4 py-2 hover:bg-gray-800 mt-4"
					>
						Logout
					</button>
				</nav>
			</aside>
			<main className="flex-1 p-6">
				<Outlet />
			</main>
		</div>
	);
}
