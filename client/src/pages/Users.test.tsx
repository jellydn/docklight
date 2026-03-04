import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../lib/schemas.js";
import { Users } from "./Users.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockUsers: User[] = [
	{
		id: 1,
		username: "alice",
		role: "admin",
		createdAt: "2024-01-15T10:00:00Z",
	},
	{
		id: 2,
		username: "bob",
		role: "operator",
		createdAt: "2024-02-20T12:00:00Z",
	},
	{
		id: 3,
		username: "carol",
		role: "viewer",
		createdAt: "2024-03-01T08:00:00Z",
	},
];

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});

const renderWithProviders = (component: React.ReactNode) => {
	const queryClient = createTestQueryClient();
	return {
		queryClient,
		...render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>{component}</MemoryRouter>
			</QueryClientProvider>
		),
	};
};

describe("Users", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		global.confirm = vi.fn(() => true) as unknown as typeof confirm;
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as ReturnType<typeof vi.fn>;
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		renderWithProviders(<Users />);

		expect(screen.getByText("Loading…")).toBeInTheDocument();
	});

	it("should render users list", async () => {
		apiFetchMock.mockResolvedValue(mockUsers);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("alice")).toBeInTheDocument();
			expect(screen.getByText("bob")).toBeInTheDocument();
			expect(screen.getByText("carol")).toBeInTheDocument();
		});
	});

	it("should display role badges", async () => {
		apiFetchMock.mockResolvedValue(mockUsers);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("admin")).toBeInTheDocument();
			expect(screen.getByText("operator")).toBeInTheDocument();
			expect(screen.getByText("viewer")).toBeInTheDocument();
		});
	});

	it("should render empty state when no users", async () => {
		apiFetchMock.mockResolvedValue([]);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("No users yet")).toBeInTheDocument();
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to load users"));

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("Failed to load users")).toBeInTheDocument();
		});
	});

	it("should display add user form", async () => {
		apiFetchMock.mockResolvedValue([]);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Add User" })).toBeInTheDocument();
			expect(screen.getByLabelText("Username")).toBeInTheDocument();
			expect(screen.getByLabelText("Password")).toBeInTheDocument();
			expect(screen.getByLabelText("Role")).toBeInTheDocument();
		});
	});

	it("should show edit controls when edit button is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockUsers);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("alice")).toBeInTheDocument();
		});

		const editButtons = screen.getAllByText("Edit");
		await user.click(editButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Save")).toBeInTheDocument();
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});
	});

	it("should cancel edit when cancel button is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockUsers);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("alice")).toBeInTheDocument();
		});

		const editButtons = screen.getAllByText("Edit");
		await user.click(editButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Cancel"));

		await waitFor(() => {
			expect(screen.queryByText("Save")).not.toBeInTheDocument();
		});
	});

	it("should have overflow-x-auto wrapper for the table", async () => {
		apiFetchMock.mockResolvedValue(mockUsers);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("alice")).toBeInTheDocument();
		});

		const tableWrapper = document.querySelector(".overflow-x-auto");
		expect(tableWrapper).toBeInTheDocument();
	});

	it("should use min-w-full on the table for responsive layout", async () => {
		apiFetchMock.mockResolvedValue(mockUsers);

		renderWithProviders(<Users />);

		await waitFor(() => {
			expect(screen.getByText("alice")).toBeInTheDocument();
		});

		const table = document.querySelector("table");
		expect(table).toHaveClass("min-w-full");
	});
});
