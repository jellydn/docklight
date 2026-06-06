import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { App, CommandHistory, ServerHealth } from "../lib/schemas.js";
import { Dashboard } from "./Dashboard";

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

const mockToastContext = {
	addToast: vi.fn(),
	removeToast: vi.fn(),
};

vi.mock("@/components/ToastProvider.js", () => ({
	useToast: () => mockToastContext,
}));

const mockHealth: ServerHealth = {
	cpu: 45.5,
	memory: 62.3,
	disk: 78.9,
	status: "warning",
	resources: {
		cpu: { value: 45.5, status: "ok" },
		memory: { value: 62.3, status: "ok" },
		disk: { value: 78.9, status: "warning" },
	},
};

const mockCriticalHealth: ServerHealth = {
	cpu: 12,
	memory: 70,
	disk: 97,
	status: "critical",
	resources: {
		cpu: { value: 12, status: "ok" },
		memory: { value: 70, status: "warning" },
		disk: { value: 97, status: "critical" },
	},
};

const mockOkHealth: ServerHealth = {
	cpu: 12,
	memory: 45,
	disk: 60,
	status: "ok",
	resources: {
		cpu: { value: 12, status: "ok" },
		memory: { value: 45, status: "ok" },
		disk: { value: 60, status: "ok" },
	},
};

const mockApps: App[] = [
	{
		name: "my-app",
		status: "running",
		domains: ["my-app.example.com"],
		lastDeployTime: "2024-01-15T10:30:00Z",
	},
	{
		name: "another-app",
		status: "stopped",
		domains: [],
		lastDeployTime: undefined,
	},
];

const mockCommands: CommandHistory[] = [
	{
		id: 1,
		command: "dokku apps:list",
		exitCode: 0,
		stdout: "my-app\nanother-app",
		stderr: "",
		createdAt: "2024-01-15T10:30:00Z",
	},
	{
		id: 2,
		command: "dokku ps:restart my-app",
		exitCode: 0,
		stdout: "Restarting my-app",
		stderr: "",
		createdAt: "2024-01-15T10:31:00Z",
	},
];

describe("Dashboard", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		global.confirm = vi.fn(() => true) as unknown as typeof confirm;
		mockAuthState.role = "admin";
		mockAuthState.canModify = true;
		mockAuthState.loading = false;
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as any;
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		const spinner = document.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	it("should render dashboard with data", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Server Health")).toBeInTheDocument();
		});
	});

	it("should render server health metrics", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("CPU")).toBeInTheDocument();
			expect(screen.getByText("Memory")).toBeInTheDocument();
			expect(screen.getByText("Disk")).toBeInTheDocument();
		});

		expect(screen.getByText("45.5%")).toBeInTheDocument();
		expect(screen.getByText("62.3%")).toBeInTheDocument();
		expect(screen.getByText("78.9%")).toBeInTheDocument();
	});

	it("should render apps section", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Apps")).toBeInTheDocument();
			expect(screen.getByText("my-app")).toBeInTheDocument();
			expect(screen.getByText("another-app")).toBeInTheDocument();
		});
	});

	it("should render recent activity section", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Recent Activity")).toBeInTheDocument();
			expect(screen.getByText("dokku apps:list")).toBeInTheDocument();
			expect(screen.getByText("dokku ps:restart my-app")).toBeInTheDocument();
		});
	});

	it("should render empty state when no apps", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve([]);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("No apps found")).toBeInTheDocument();
		});
	});

	it("should render empty state when no commands", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("No recent activity")).toBeInTheDocument();
		});
	});

	it("should refresh data when refresh button is clicked", async () => {
		const user = userEvent.setup();
		let fetchCount = 0;
		apiFetchMock.mockImplementation((endpoint: string) => {
			fetchCount++;
			if (endpoint === "/server/health") {
				return Promise.resolve(mockHealth);
			}
			if (endpoint === "/apps") return Promise.resolve([]);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("45.5%")).toBeInTheDocument();
		});

		const initialCallCount = fetchCount;
		const refreshButton = screen.getByText("Refresh");
		await user.click(refreshButton);

		// Wait for the refetch to complete
		await waitFor(() => {
			expect(fetchCount).toBeGreaterThan(initialCallCount);
		});
	});

	it("should show create app button", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve([]);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			const createButtons = screen.getAllByText("Create App");
			expect(createButtons.length).toBeGreaterThan(0);
		});
	});

	it("should hide create app button for viewer role", async () => {
		mockAuthState.role = "viewer";
		mockAuthState.canModify = false;

		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
		});

		expect(screen.queryByText("Create App")).not.toBeInTheDocument();
	});

	it("should display app status badges", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("running")).toBeInTheDocument();
			expect(screen.getByText("stopped")).toBeInTheDocument();
		});
	});

	it("should render watch closely label for warning health", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("VPS status: Watch closely")).toBeInTheDocument();
		});
	});

	it("should render warning label for critical health", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockCriticalHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("VPS status: Warning")).toBeInTheDocument();
		});
	});

	it("should show cleanup button for admin", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Clean unused" })).toBeInTheDocument();
		});
	});

	it("should hide cleanup button for viewer role", async () => {
		mockAuthState.role = "viewer";
		mockAuthState.canModify = false;

		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockCriticalHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("VPS status: Warning")).toBeInTheDocument();
		});

		expect(screen.queryByRole("button", { name: "Clean unused" })).not.toBeInTheDocument();
	});

	it("should confirm cleanup, call endpoint, and refresh data", async () => {
		const user = userEvent.setup();
		let healthFetchCount = 0;
		let commandsFetchCount = 0;

		apiFetchMock.mockImplementation(
			(endpoint: string, _schema?: unknown, options?: RequestInit) => {
				if (endpoint === "/server/cleanup" && options?.method === "POST") {
					return Promise.resolve({
						command: "dokku cleanup",
						exitCode: 0,
						stdout: "Cleanup complete",
						stderr: "",
					});
				}
				if (endpoint === "/server/health") {
					healthFetchCount++;
					return Promise.resolve(mockOkHealth);
				}
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				if (endpoint === "/commands?limit=20") {
					commandsFetchCount++;
					return Promise.resolve(mockCommands);
				}
				return Promise.reject(new Error("Unknown endpoint"));
			}
		);

		renderWithQueryClient(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Clean unused" })).toBeInTheDocument();
		});

		const initialHealthFetches = healthFetchCount;
		const initialCommandsFetches = commandsFetchCount;

		await user.click(screen.getByRole("button", { name: "Clean unused" }));

		await waitFor(() => {
			expect(global.confirm).toHaveBeenCalled();
			expect(apiFetchMock).toHaveBeenCalledWith(
				"/server/cleanup",
				expect.anything(),
				expect.objectContaining({ method: "POST" })
			);
			expect(mockToastContext.addToast).toHaveBeenCalledWith("success", "Cleanup completed");
			expect(healthFetchCount).toBeGreaterThan(initialHealthFetches);
			expect(commandsFetchCount).toBeGreaterThan(initialCommandsFetches);
		});
	});
});
