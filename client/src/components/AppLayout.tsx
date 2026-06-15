import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { logger } from "../lib/logger.js";
import { queryClient } from "../lib/query-client.js";
import { queryKeys } from "../lib/query-keys.js";
import { useAuth } from "@/contexts/auth-context.js";
import { useAppEvents } from "@/hooks/use-app-events.js";
import {
	LayoutDashboard,
	AppWindow,
	Database,
	Puzzle,
	ScrollText,
	Users,
	Settings,
	LogOut,
	Menu,
	X,
} from "lucide-react";

const navItems = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/apps", label: "Apps", icon: AppWindow },
	{ to: "/databases", label: "Databases", icon: Database },
	{ to: "/plugins", label: "Plugins", icon: Puzzle },
	{ to: "/audit", label: "Audit Logs", icon: ScrollText },
] as const;

const adminNavItems = [
	{ to: "/users", label: "Users", icon: Users },
	{ to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { role, username } = useAuth();

	useAppEvents();

	const handleLogout = async () => {
		try {
			await apiFetch("/auth/logout", z.object({ success: z.literal(true) }), {
				method: "POST",
			});
			await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
			queryClient.clear();
			navigate("/login");
		} catch (err) {
			logger.error({ err }, "Logout failed");
		}
	};

	const closeSidebar = () => setSidebarOpen(false);

	const isActive = (path: string): boolean =>
		location.pathname === path || location.pathname.startsWith(path + "/");

	const sidebarClasses = `fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border text-card-foreground transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:z-auto md:pointer-events-auto ${
		sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
	}`;

	return (
		<div className="flex min-h-screen bg-background">
			{/* Mobile overlay */}
			{sidebarOpen && (
				<button
					type="button"
					className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
					onClick={closeSidebar}
					aria-label="Close menu"
				/>
			)}

			{/* Sidebar */}
			<aside className={`${sidebarClasses} flex flex-col`}>
				<div className="flex items-center justify-between p-4 border-b border-border">
					<div className="flex items-center gap-2">
						<img src="/logo.svg" alt="Docklight logo" className="h-6 w-6" />
						<h1 className="text-xl font-bold">Docklight</h1>
					</div>
					<button
						type="button"
						onClick={closeSidebar}
						className="md:hidden text-muted-foreground hover:text-foreground"
						aria-label="Close menu"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<nav className="mt-4 flex-1 px-2 space-y-1">
					{navItems.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							onClick={closeSidebar}
							className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
								isActive(to)
									? "bg-accent text-foreground"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
							}`}
						>
							<Icon className="h-4 w-4" />
							{label}
						</Link>
					))}
					{role === "admin" &&
						adminNavItems.map(({ to, label, icon: Icon }) => (
							<Link
								key={to}
								to={to}
								onClick={closeSidebar}
								className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									isActive(to)
										? "bg-accent text-foreground"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
								}`}
							>
								<Icon className="h-4 w-4" />
								{label}
							</Link>
						))}
					<button
						type="button"
						onClick={handleLogout}
						className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors w-full mt-4"
					>
						<LogOut className="h-4 w-4" />
						Logout
					</button>
				</nav>
				{username && (
					<div className="mt-auto border-t border-border p-4">
						<p className="text-sm font-medium truncate">{username}</p>
						{role && (
							<p className="text-xs text-muted-foreground capitalize">{role}</p>
						)}
					</div>
				)}
			</aside>

			<div className="flex flex-col flex-1 min-w-0">
				{/* Mobile top bar */}
				<header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setSidebarOpen(true)}
							className="text-muted-foreground hover:text-foreground"
							aria-label="Open menu"
						>
							<Menu className="h-5 w-5" />
						</button>
						<div className="flex items-center gap-2">
							<img src="/logo.svg" alt="Docklight logo" className="h-6 w-6" />
							<h1 className="text-lg font-bold">Docklight</h1>
						</div>
					</div>
				</header>

				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
