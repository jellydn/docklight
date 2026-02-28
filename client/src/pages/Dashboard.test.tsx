import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import type { App, ServerHealth, CommandHistory } from "../lib/schemas.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockHealth: ServerHealth = {
	cpu: 45.5,
	memory: 62.3,
	disk: 78.9,
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
		vi.useFakeTimers();
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as any;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("should render dashboard with data", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve(mockCommands);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
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

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
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

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
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

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
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

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
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

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("No recent activity")).toBeInTheDocument();
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to load data"));

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Failed to load data")).toBeInTheDocument();
		});
	});

	it("should refresh data when refresh button is clicked", async () => {
		const user = userEvent.setup();
		let fetchCount = 0;
		apiFetchMock.mockImplementation((endpoint: string) => {
			fetchCount++;
			if (endpoint === "/server/health") {
				if (fetchCount <= 3) {
					return Promise.resolve(mockHealth);
				}
				return Promise.resolve({ ...mockHealth, cpu: 50.0 });
			}
			if (endpoint === "/apps") return Promise.resolve([]);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("45.5%")).toBeInTheDocument();
		});

		const refreshButton = screen.getByText("Refresh");
		await user.click(refreshButton);

		await vi.waitFor(() => {
			expect(apiFetchMock).toHaveBeenCalled();
		});
	});

	it("should show create app button", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve([]);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const createButtons = screen.getAllByText("Create App");
			expect(createButtons.length).toBeGreaterThan(0);
		});
	});

	it("should display app status badges", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/server/health") return Promise.resolve(mockHealth);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			if (endpoint === "/commands?limit=20") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("running")).toBeInTheDocument();
			expect(screen.getByText("stopped")).toBeInTheDocument();
		});
	});
});
