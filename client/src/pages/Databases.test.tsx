import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Databases } from "./Databases.js";
import type { Database, App } from "../lib/schemas.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockToastContext = {
	addToast: vi.fn(),
};

vi.mock("../components/ToastProvider.js", () => ({
	useToast: () => mockToastContext,
}));

const mockDatabases: Database[] = [
	{
		name: "postgres-test-db",
		plugin: "postgres",
		linkedApps: ["my-app"],
		connectionInfo: "postgres://host:5432/db",
	},
	{
		name: "redis-cache",
		plugin: "redis",
		linkedApps: [],
		connectionInfo: "redis://host:6379",
	},
];

const mockApps: App[] = [
	{
		name: "my-app",
		status: "running",
		domains: ["my-app.example.com"],
		lastDeployTime: "2024-01-15T10:30:00Z",
	},
	{
		name: "another-app",
		status: "running",
		domains: ["another-app.example.com"],
		lastDeployTime: undefined,
	},
];

describe("Databases", () => {
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
				<Databases />
			</MemoryRouter>
		);

		const spinner = document.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	it("should render databases page", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Databases")).toBeInTheDocument();
		});
	});

	it("should render empty state when no databases", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve([]);
			if (endpoint === "/apps") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("No databases found")).toBeInTheDocument();
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to load data"));

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Failed to load data")).toBeInTheDocument();
		});
	});

	it("should display install plugin form", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve([]);
			if (endpoint === "/apps") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Install Dokku Plugin")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Repository URL or owner/repo")).toBeInTheDocument();
		});
	});

	it("should display create database form", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve([]);
			if (endpoint === "/apps") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Create New Database")).toBeInTheDocument();
			expect(screen.getByText("Select plugin")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Database name")).toBeInTheDocument();
		});
	});

	it("should display databases grouped by plugin", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("postgres Databases")).toBeInTheDocument();
			expect(screen.getByText("redis Databases")).toBeInTheDocument();
			expect(screen.getByText("postgres-test-db")).toBeInTheDocument();
			expect(screen.getByText("redis-cache")).toBeInTheDocument();
		});
	});

	it("should display database details", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("postgres-test-db")).toBeInTheDocument();
			expect(screen.getAllByText(/plugin/i).length).toBeGreaterThan(0);
			expect(screen.getAllByText(/linked apps/i).length).toBeGreaterThan(0);
			expect(screen.getAllByText(/connection info/i).length).toBeGreaterThan(0);
		});
	});

	it("should show linked apps for database", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			const myAppElements = screen.getAllByText("my-app");
			expect(myAppElements.length).toBeGreaterThan(0);
		});
	});

	it("should show no linked apps message when none", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			const noLinkedApps = screen.getAllByText("No linked apps");
			expect(noLinkedApps.length).toBeGreaterThan(0);
		});
	});

	it("should display popular plugin buttons", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve([]);
			if (endpoint === "/apps") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Postgres")).toBeInTheDocument();
			expect(screen.getByText("Redis")).toBeInTheDocument();
			expect(screen.getByText("MySQL")).toBeInTheDocument();
		});
	});

	it("should open unlink confirmation dialog", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			expect(screen.getAllByText("my-app").length).toBeGreaterThan(0);
		});

		const unlinkButtons = screen.getAllByText("Unlink");
		expect(unlinkButtons.length).toBeGreaterThan(0);
		await user.click(unlinkButtons[0]);

		await vi.waitFor(() => {
			expect(screen.getByText("Confirm Unlink")).toBeInTheDocument();
		});
	});

	it("should open destroy confirmation dialog", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		render(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await vi.waitFor(() => {
			const destroyButtons = screen.getAllByText("Destroy Database");
			expect(destroyButtons.length).toBeGreaterThan(0);
		});

		const destroyButtons = screen.getAllByText("Destroy Database");
		expect(destroyButtons.length).toBeGreaterThan(0);
		await user.click(destroyButtons[0]);

		await vi.waitFor(() => {
			expect(screen.getByText("Confirm Destroy")).toBeInTheDocument();
		});
	});
});
