import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "./components/AppLayout";
import { RequireAdmin } from "./components/RequireAdmin";
import { ToastProvider } from "./components/ToastProvider";
import { AuthProvider } from "./contexts/auth-context.js";
import { Login } from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Apps = lazy(() => import("./pages/Apps").then((m) => ({ default: m.Apps })));
const AppDetail = lazy(() => import("./pages/AppDetail").then((m) => ({ default: m.AppDetail })));
const Databases = lazy(() => import("./pages/Databases").then((m) => ({ default: m.Databases })));
const Plugins = lazy(() => import("./pages/Plugins").then((m) => ({ default: m.Plugins })));
const Audit = lazy(() => import("./pages/Audit").then((m) => ({ default: m.Audit })));
const Users = lazy(() => import("./pages/Users").then((m) => ({ default: m.Users })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));

function App() {
	return (
		<ToastProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route
						path="/"
						element={
							<AuthProvider>
								<AppLayout />
							</AuthProvider>
						}
					>
						<Route index element={<Navigate to="/dashboard" />} />
						<Route
							path="dashboard"
							element={
								<Suspense>
									<Dashboard />
								</Suspense>
							}
						/>
						<Route
							path="apps"
							element={
								<Suspense>
									<Apps />
								</Suspense>
							}
						/>
						<Route
							path="apps/:name"
							element={
								<Suspense>
									<AppDetail />
								</Suspense>
							}
						/>
						<Route
							path="databases"
							element={
								<Suspense>
									<Databases />
								</Suspense>
							}
						/>
						<Route
							path="plugins"
							element={
								<Suspense>
									<Plugins />
								</Suspense>
							}
						/>
						<Route
							path="audit"
							element={
								<Suspense>
									<Audit />
								</Suspense>
							}
						/>
						<Route
							path="users"
							element={
								<RequireAdmin>
									<Suspense>
										<Users />
									</Suspense>
								</RequireAdmin>
							}
						/>
						<Route
							path="settings"
							element={
								<RequireAdmin>
									<Suspense>
										<Settings />
									</Suspense>
								</RequireAdmin>
							}
						/>
					</Route>
				</Routes>
				<Toaster
					position="bottom-right"
					closeButton
					toastOptions={{
						classNames: {
							toast: "!border-gray-200 !bg-white !text-gray-900",
							description: "!text-gray-600",
						},
					}}
				/>
			</BrowserRouter>
		</ToastProvider>
	);
}

export default App;
