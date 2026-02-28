import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Apps } from "./Apps";
import type { App } from "../lib/schemas.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

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

describe("Apps", () => {
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
				<Apps />
			</MemoryRouter>,
		);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("should render apps list", async () => {
		apiFetchMock.mockResolvedValue(mockApps);

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("my-app")).toBeInTheDocument();
			expect(screen.getByText("another-app")).toBeInTheDocument();
		});

		expect(screen.getByText("running")).toBeInTheDocument();
		expect(screen.getByText("stopped")).toBeInTheDocument();
		expect(screen.getByText("my-app.example.com")).toBeInTheDocument();
	});

	it("should render empty state when no apps", async () => {
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("No apps found")).toBeInTheDocument();
			expect(screen.getByText("Create your first app")).toBeInTheDocument();
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to load"));

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Failed to load")).toBeInTheDocument();
		});
	});

	it("should open create app dialog when button is clicked", async () => {
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Create App")).toBeInTheDocument();
		});

		const createButton = screen.getAllByText("Create App")[0];
		await userEvent.click(createButton);

		await vi.waitFor(() => {
			expect(screen.getByText("Create New App")).toBeInTheDocument();
		});
	});

	it("should display app names as links", async () => {
		apiFetchMock.mockResolvedValue(mockApps);

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const appLink = screen.getByRole("link", { name: "my-app" });
			expect(appLink).toBeInTheDocument();
			expect(appLink).toHaveAttribute("href", "/apps/my-app");
		});
	});

	it("should show domains list for apps with domains", async () => {
		apiFetchMock.mockResolvedValue(mockApps);

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("my-app.example.com")).toBeInTheDocument();
		});
	});

	it("should show dash for apps without domains", async () => {
		apiFetchMock.mockResolvedValue(mockApps);

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const dashes = screen.getAllByText("-");
			expect(dashes.length).toBeGreaterThan(0);
		});
	});

	it("should format last deploy time", async () => {
		apiFetchMock.mockResolvedValue(mockApps);

		render(
			<MemoryRouter>
				<Apps />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
		});
	});
});
