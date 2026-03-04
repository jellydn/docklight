import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginInfo } from "../lib/schemas.js";
import { Plugins } from "./Plugins";

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const renderWithQueryClient = (ui: React.ReactElement) => {
	const testQueryClient = createTestQueryClient();
	return render(<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>);
};

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockAuthState: { role: string; loading: boolean; canModify: boolean } = {
	role: "admin",
	loading: false,
	canModify: true,
};

vi.mock("../contexts/auth-context.js", () => ({
	useAuth: () => mockAuthState,
}));

const mockPlugins: PluginInfo[] = [
	{
		name: "dokku-postgres",
		enabled: true,
		version: "1.12.0",
	},
	{
		name: "dokku-redis",
		enabled: true,
		version: "0.5.0",
	},
	{
		name: "dokku-mysql",
		enabled: false,
	},
];

describe("Plugins", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render plugins page with installed plugins", async () => {
		const { apiFetch } = await import("../lib/api.js");
		vi.mocked(apiFetch).mockResolvedValue(mockPlugins);

		renderWithQueryClient(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Plugins")).toBeInTheDocument();
		});

		expect(screen.getByText("Installed Plugins")).toBeInTheDocument();
		expect(screen.getByText("dokku-postgres")).toBeInTheDocument();
		expect(screen.getByText(/v1.12.0/)).toBeInTheDocument();
	});

	it("should render empty state with install guide when no plugins", async () => {
		const { apiFetch } = await import("../lib/api.js");
		vi.mocked(apiFetch).mockResolvedValue([]);

		renderWithQueryClient(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Plugins")).toBeInTheDocument();
		});

		expect(screen.getByText("No plugins found")).toBeInTheDocument();
		expect(screen.getByText("How to install plugins")).toBeInTheDocument();
		expect(screen.getByText(/sudo dokku plugin:install <repository-url>/)).toBeInTheDocument();
	});

	it("should render error state when API fails", async () => {
		const { apiFetch } = await import("../lib/api.js");
		vi.mocked(apiFetch).mockRejectedValue(new Error("Failed to connect"));

		renderWithQueryClient(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Failed to connect")).toBeInTheDocument();
		});
	});

	it("should display plugin status correctly", async () => {
		const { apiFetch } = await import("../lib/api.js");
		vi.mocked(apiFetch).mockResolvedValue(mockPlugins);

		renderWithQueryClient(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getAllByText(/Status: Enabled/).length).toBe(2);
		});

		expect(screen.getByText(/Status: Disabled/)).toBeInTheDocument();
	});
});
