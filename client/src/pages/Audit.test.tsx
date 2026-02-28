import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Audit } from "./Audit";
import type { CommandHistory } from "../lib/schemas.js";

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

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		const spinner = document.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	it("should render audit logs page", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
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

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("No audit logs found matching your filters.")).toBeInTheDocument();
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to fetch audit logs"));

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Failed to fetch audit logs")).toBeInTheDocument();
		});
	});

	it("should display filters section", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Filters")).toBeInTheDocument();
			expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
			expect(screen.getByLabelText("End Date")).toBeInTheDocument();
			expect(screen.getByLabelText("Command Search")).toBeInTheDocument();
			expect(screen.getByLabelText("Exit Code")).toBeInTheDocument();
		});
	});

	it("should display logs table with data", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("dokku apps:create my-app")).toBeInTheDocument();
			expect(screen.getByText("dokku ps:restart my-app")).toBeInTheDocument();
			expect(screen.getByText("dokku domains:add my-app invalid-domain")).toBeInTheDocument();
		});
	});

	it("should display success badge for exit code 0", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const successBadges = screen.getAllByText("Success");
			expect(successBadges.length).toBeGreaterThan(0);
		});
	});

	it("should display error badge for non-zero exit code", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Error (1)")).toBeInTheDocument();
		});
	});

	it("should show total logs count", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("3 logs found")).toBeInTheDocument();
		});
	});

	it("should show singular log count when total is 1", async () => {
		apiFetchMock.mockResolvedValue({
			logs: [mockLogs[0]],
			total: 1,
			limit: 50,
			offset: 0,
		});

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("1 log found")).toBeInTheDocument();
		});
	});

	it("should expand log details when view details is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await user.click(viewButtons[0]);

		await vi.waitFor(() => {
			expect(screen.getByText("Stdout")).toBeInTheDocument();
			expect(screen.getByText("Stderr")).toBeInTheDocument();
		});
	});

	it("should collapse log details when hide details is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await user.click(viewButtons[0]);

		await vi.waitFor(() => {
			const hideButtons = screen.getAllByText("Hide Details");
			expect(hideButtons.length).toBeGreaterThan(0);
		});

		const hideButtons = screen.getAllByText("Hide Details");
		await user.click(hideButtons[0]);

		await vi.waitFor(() => {
			expect(screen.queryByText("Stdout")).not.toBeInTheDocument();
		});
	});

	it("should update filter when command search is changed", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByLabelText("Command Search")).toBeInTheDocument();
		});

		const searchInput = screen.getByLabelText("Command Search");
		await user.type(searchInput, "create");

		await vi.waitFor(() => {
			expect(searchInput).toHaveValue("create");
		});
	});

	it("should have reset filters button", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Reset Filters")).toBeInTheDocument();
		});
	});

	it("should display no output message when stdout is empty", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await userEvent.click(viewButtons[2]); // Click the one with empty stdout

		await vi.waitFor(() => {
			expect(screen.getByText("No output")).toBeInTheDocument();
		});
	});

	it("should display no errors message when stderr is empty", async () => {
		apiFetchMock.mockResolvedValue(mockLogResult);

		render(
			<MemoryRouter>
				<Audit />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const viewButtons = screen.getAllByText("View Details");
			expect(viewButtons.length).toBeGreaterThan(0);
		});

		const viewButtons = screen.getAllByText("View Details");
		await userEvent.click(viewButtons[0]); // Click the one with empty stderr

		await vi.waitFor(() => {
			expect(screen.getByText("No errors")).toBeInTheDocument();
		});
	});
});
