import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "./components/AppLayout";
import { ToastProvider } from "./components/ToastProvider";
import { AppDetail } from "./pages/AppDetail";
import { Apps } from "./pages/Apps";
import { Dashboard } from "./pages/Dashboard";
import { Databases } from "./pages/Databases";
import { Login } from "./pages/Login";
import { Plugins } from "./pages/Plugins";

function App() {
	return (
		<ToastProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/" element={<AppLayout />}>
						<Route index element={<Navigate to="/dashboard" />} />
						<Route path="dashboard" element={<Dashboard />} />
						<Route path="apps" element={<Apps />} />
						<Route path="apps/:name" element={<AppDetail />} />
						<Route path="databases" element={<Databases />} />
						<Route path="plugins" element={<Plugins />} />
					</Route>
				</Routes>
				<Toaster position="bottom-right" richColors closeButton />
			</BrowserRouter>
		</ToastProvider>
	);
}

export default App;
