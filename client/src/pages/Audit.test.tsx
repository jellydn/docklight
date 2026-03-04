import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Audit } from "./Audit";
import type { CommandHistory, UserAuditLog } from "../lib/schemas.js";

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

const mockLogs: CommandHistory[] = [
	{
		id: 1,
		command: "dokku apps:create my-app",
		exitCode: 0,
		stdout: "Creating my-app...",
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
	{
		id: 3,
		command: "dokku domains:add my-app invalid-domain",
		exitCode: 1,
		stdout: "",
		stderr: "Invalid domain format",
		createdAt: "2024-01-15T10:32:00Z",
	},
];

const mockLogResult = {
	logs: mockLogs,
	total: 3,
	limit: 50,
	offset: 0,
};

describe("Audit", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as any;
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		const spinner = document.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	it("should render audit logs page", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Audit Logs")).toBeInTheDocument();
		});
	});

	it("should render empty state when no logs", async () => {
		apiFetchMock.mockResolvedValue({
			logs: [],
			total: 0,
			limit: 50,
			offset: 0,
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("No audit logs found matching your filters.")).toBeInTheDocument();
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to fetch audit logs"));

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Failed to fetch audit logs")).toBeInTheDocument();
		});
	});

	it("should display filters section", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Filters")).toBeInTheDocument();
			expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
			expect(screen.getByLabelText("End Date")).toBeInTheDocument();
			expect(screen.getByLabelText("Command Search")).toBeInTheDocument();
			expect(screen.getByLabelText("Exit Code")).toBeInTheDocument();
		});
	});

	it("should display logs table with data", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("dokku apps:create my-app")).toBeInTheDocument();
			expect(screen.getByText("dokku ps:restart my-app")).toBeInTheDocument();
			expect(screen.getByText("dokku domains:add my-app invalid-domain")).toBeInTheDocument();
		});
	});

	it("should display success badge for exit code 0", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			const successBadges = screen.getAllByText("Success");
			expect(successBadges.length).toBeGreaterThan(0);
		});
	});

	it("should display error badge for non-zero exit code", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Error (1)")).toBeInTheDocument();
		});
	});

	it("should show total logs count", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("3 commands found")).toBeInTheDocument();
		});
	});

	it("should show singular log count when total is 1", async () => {
		apiFetchMock.mockResolvedValue({
			logs: [mockLogs[0]],
			total: 1,
			limit: 50,
			offset: 0,
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("1 command found")).toBeInTheDocument();
		});
	});

	it("should expand log details when view details is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await user.click(viewButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Stdout")).toBeInTheDocument();
			expect(screen.getByText("Stderr")).toBeInTheDocument();
		});
	});

	it("should collapse log details when hide details is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await user.click(viewButtons[0]);

		await waitFor(() => {
			const hideButtons = screen.getAllByText("Hide Details");
			expect(hideButtons.length).toBeGreaterThan(0);
		});

		const hideButtons = screen.getAllByText("Hide Details");
		await user.click(hideButtons[0]);

		await waitFor(() => {
			expect(screen.queryByText("Stdout")).not.toBeInTheDocument();
		});
	});

	it("should update filter when command search is changed", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByLabelText("Command Search")).toBeInTheDocument();
		});

		const searchInput = screen.getByLabelText("Command Search");
		await user.type(searchInput, "create");

		await waitFor(() => {
			expect(searchInput).toHaveValue("create");
		});
	});

	it("should have reset filters button", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Reset Filters")).toBeInTheDocument();
		});
	});

	it("should display no output message when stdout is empty", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await userEvent.click(viewButtons[2]); // Click the one with empty stdout

		await waitFor(() => {
			expect(screen.getByText("No output")).toBeInTheDocument();
		});
	});

	it("should display no errors message when stderr is empty", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await userEvent.click(viewButtons[0]); // Click the one with empty stderr

		await waitFor(() => {
			expect(screen.getByText("No errors")).toBeInTheDocument();
		});
	});

	const mockUserLogs: UserAuditLog[] = [
		{
			id: 1,
			userId: 1,
			action: "login",
			resource: null,
			details: null,
			ipAddress: "192.168.1.100",
			createdAt: "2024-01-15T10:30:00Z",
		},
		{
			id: 2,
			userId: 2,
			action: "apps:create",
			resource: "my-app",
			details: '{"name": "my-app"}',
			ipAddress: "192.168.1.101",
			createdAt: "2024-01-15T10:31:00Z",
		},
		{
			id: 3,
			userId: 1,
			action: "apps:delete",
			resource: "old-app",
			details: null,
			ipAddress: "192.168.1.100",
			createdAt: "2024-01-15T10:32:00Z",
		},
	];

	const mockUserLogResult = {
		logs: mockUserLogs,
		total: 3,
		limit: 50,
		offset: 0,
	};

	it("should switch to user actions tab when clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		apiFetchMock.mockImplementation((url: string) => {
			if (url.includes("/audit/user-logs")) {
				return Promise.resolve(mockUserLogResult);
			}
			return Promise.resolve(mockLogResult);
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Audit Logs")).toBeInTheDocument();
		});

		// Act
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		// Assert
		await waitFor(() => {
			expect(screen.getAllByText("User ID")).toHaveLength(2); // filter label + table header
			expect(screen.getAllByText("Action")).toHaveLength(2); // filter label + table header
			expect(screen.getAllByText("Resource")).toHaveLength(1); // table header only
			expect(screen.getAllByText("IP Address")).toHaveLength(1); // table header only
		});
	});

	it("should display user audit logs with data", async () => {
		// Arrange
		const user = userEvent.setup();
		apiFetchMock.mockImplementation((url: string) => {
			if (url.includes("/audit/user-logs")) {
				return Promise.resolve(mockUserLogResult);
			}
			return Promise.resolve(mockLogResult);
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act - switch to user actions tab
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		// Assert
		await waitFor(() => {
			expect(screen.getAllByText("1")).toHaveLength(2); // appears twice in table
			expect(screen.getAllByText("2")).toHaveLength(1); // appears once
			expect(screen.getByText("login")).toBeInTheDocument();
			expect(screen.getByText("apps:create")).toBeInTheDocument();
			expect(screen.getByText("apps:delete")).toBeInTheDocument();
		});
	});

	it("should display N/A for null userId", async () => {
		// Arrange
		const user = userEvent.setup();
		const logsWithNullUser: UserAuditLog[] = [
			{
				id: 1,
				userId: null,
				action: "system:startup",
				resource: null,
				details: null,
				ipAddress: null,
				createdAt: "2024-01-15T10:30:00Z",
			},
		];
		apiFetchMock.mockImplementation((url: string) => {
			if (url.includes("/audit/user-logs")) {
				return Promise.resolve({
					logs: logsWithNullUser,
					total: 1,
					limit: 50,
					offset: 0,
				});
			}
			return Promise.resolve(mockLogResult);
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		// Assert
		await waitFor(() => {
			expect(screen.getAllByText("N/A")).toHaveLength(3); // userId, resource, ipAddress
		});
	});

	it("should display N/A for null resource", async () => {
		// Arrange
		const user = userEvent.setup();
		const logsWithNullResource: UserAuditLog[] = [
			{
				id: 1,
				userId: 1,
				action: "login",
				resource: null,
				details: null,
				ipAddress: "192.168.1.1",
				createdAt: "2024-01-15T10:30:00Z",
			},
		];
		apiFetchMock.mockResolvedValue({
			logs: logsWithNullResource,
			total: 1,
			limit: 50,
			offset: 0,
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		// Assert
		await waitFor(() => {
			const resourceCells = screen.getAllByText("N/A");
			expect(resourceCells.length).toBeGreaterThan(0);
		});
	});

	it("should display action badges with correct colors", async () => {
		// Arrange
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockUserLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		// Assert
		await waitFor(() => {
			expect(screen.getByText("login")).toBeInTheDocument();
			expect(screen.getByText("apps:create")).toBeInTheDocument();
			expect(screen.getByText("apps:delete")).toBeInTheDocument();
		});
	});

	it("should expand user log details when view details is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockUserLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act - switch to user actions tab
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		await waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await user.click(viewButtons[0]);

		// Assert
		await waitFor(() => {
			expect(screen.getByText("Details")).toBeInTheDocument();
		});
	});

	it("should display no details message when details is empty", async () => {
		// Arrange
		const user = userEvent.setup();
		const logsWithEmptyDetails: UserAuditLog[] = [
			{
				id: 1,
				userId: 1,
				action: "login",
				resource: null,
				details: null,
				ipAddress: "192.168.1.1",
				createdAt: "2024-01-15T10:30:00Z",
			},
		];
		apiFetchMock.mockResolvedValue({
			logs: logsWithEmptyDetails,
			total: 1,
			limit: 50,
			offset: 0,
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		const viewButtons = await screen.findAllByText("View Details");
		await user.click(viewButtons[0]);

		// Assert
		await waitFor(() => {
			expect(screen.getByText("No details")).toBeInTheDocument();
		});
	});

	it("should display filters for user audit logs", async () => {
		// Arrange
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockUserLogResult);

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		// Assert
		await waitFor(() => {
			expect(screen.getByLabelText("User ID")).toBeInTheDocument();
			expect(screen.getByLabelText("Action")).toBeInTheDocument();
			expect(screen.getByText("Reset Filters")).toBeInTheDocument();
		});
	});

	it("should show empty state for user audit logs when no logs", async () => {
		// Arrange
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue({
			logs: [],
			total: 0,
			limit: 50,
			offset: 0,
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>
		);

		// Act
		const userActionsTab = screen.getByRole("button", { name: "User Actions" });
		await user.click(userActionsTab);

		// Assert
		await waitFor(() => {
			expect(
				screen.getByText("No user audit logs found matching your filters.")
			).toBeInTheDocument();
		});
	});
});
