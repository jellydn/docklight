import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { logger } from "../lib/logger.js";

export function AppLayout() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const handleLogout = async () => {
		try {
			await apiFetch("/auth/logout", z.object({ success: z.literal(true) }), {
				method: "POST",
			});
			navigate("/login");
		} catch (err) {
			logger.error({ err }, "Logout failed");
		}
	};

	const closeSidebar = () => setSidebarOpen(false);

	const sidebarClasses = `fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:z-auto md:pointer-events-auto ${
		sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
	}`;

	return (
		<div className="flex min-h-screen bg-gray-100">
			{/* Mobile overlay */}
			{sidebarOpen && (
				<button
					type="button"
					className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
					onClick={closeSidebar}
					aria-label="Close menu"
				/>
			)}

			{/* Sidebar */}
			<aside className={sidebarClasses}>
				<div className="flex items-center justify-between p-4">
					<div className="flex items-center gap-2">
						<img src="/logo.svg" alt="Docklight logo" className="h-6 w-6" />
						<h1 className="text-xl font-bold">Docklight</h1>
					</div>
					<button
						onClick={closeSidebar}
						className="md:hidden text-gray-400 hover:text-white"
						aria-label="Close menu"
					>
						✕
					</button>
				</div>
				<nav className="mt-4">
					<Link
						to="/dashboard"
						className="block px-4 py-2 hover:bg-gray-800"
						onClick={closeSidebar}
					>
						Dashboard
					</Link>
					<Link to="/apps" className="block px-4 py-2 hover:bg-gray-800" onClick={closeSidebar}>
						Apps
					</Link>
					<Link
						to="/databases"
						className="block px-4 py-2 hover:bg-gray-800"
						onClick={closeSidebar}
					>
						Databases
					</Link>
					<Link to="/plugins" className="block px-4 py-2 hover:bg-gray-800" onClick={closeSidebar}>
						Plugins
					</Link>
					<Link to="/audit" className="block px-4 py-2 hover:bg-gray-800" onClick={closeSidebar}>
						Audit Logs
					</Link>
					<button
						onClick={handleLogout}
						className="w-full text-left px-4 py-2 hover:bg-gray-800 mt-4"
					>
						Logout
					</button>
				</nav>
			</aside>

			<div className="flex flex-col flex-1 min-w-0">
				{/* Mobile top bar */}
				<header className="md:hidden flex items-center px-4 py-3 bg-gray-900 text-white">
					<button
						onClick={() => setSidebarOpen(true)}
						className="text-gray-400 hover:text-white mr-3"
						aria-label="Open menu"
					>
						☰
					</button>
					<div className="flex items-center gap-2">
						<img src="/logo.svg" alt="Docklight logo" className="h-6 w-6" />
						<h1 className="text-lg font-bold">Docklight</h1>
					</div>
				</header>

				<main className="flex-1 p-4 md:p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
