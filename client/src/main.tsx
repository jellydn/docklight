import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./contexts/theme-context.js";
import { queryClient } from "./lib/query-client.js";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<App />
			</ThemeProvider>
		</QueryClientProvider>
	</StrictMode>
);
