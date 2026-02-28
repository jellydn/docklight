import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
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

		await waitFor(() => {
			expect(screen.getAllByText("my-app").length).toBeGreaterThan(0);
		});

		const unlinkButtons = screen.getAllByText("Unlink");
		expect(unlinkButtons.length).toBeGreaterThan(0);
		await user.click(unlinkButtons[0]);

		await waitFor(() => {
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

		await waitFor(() => {
			const destroyButtons = screen.getAllByText("Destroy Database");
			expect(destroyButtons.length).toBeGreaterThan(0);
		});

		const destroyButtons = screen.getAllByText("Destroy Database");
		expect(destroyButtons.length).toBeGreaterThan(0);
		await user.click(destroyButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Confirm Destroy")).toBeInTheDocument();
		});
	});

	describe("with submitting states", () => {
		it("should disable create button during database creation", async () => {
			const user = userEvent.setup();
			let createResolver: () => void;
			const createPromise = new Promise<void>((resolve) => {
				createResolver = resolve;
			});

			apiFetchMock.mockImplementation((endpoint: string, _schema?: any, options?: any) => {
				if (endpoint === "/databases" && options?.method === "POST") {
					return createPromise;
				}
				if (endpoint === "/databases") return Promise.resolve([]);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				return Promise.reject(new Error("Unknown endpoint"));
			});

			render(
				<MemoryRouter>
					<Databases />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Create New Database")).toBeInTheDocument();
			});

			// Select plugin
			const selectElement = screen.getByText("Select plugin").closest("select");
			await user.selectOptions(selectElement!, "postgres");

			// Type database name
			const nameInput = screen.getByPlaceholderText("Database name");
			await user.type(nameInput, "test-db");

			// Click create button
			const createButton = screen.getByText("Create").closest("button");
			await user.click(createButton!);

			await waitFor(() => {
				expect(createButton).toBeDisabled();
			});

			// Cleanup: resolve pending state update inside act
			await act(async () => {
				createResolver!();
				await Promise.resolve();
			});
		});

		it("should disable install plugin button during installation", async () => {
			const user = userEvent.setup();
			apiFetchMock.mockImplementation((endpoint: string) => {
				if (endpoint === "/databases") return Promise.resolve([]);
				if (endpoint === "/apps") return Promise.resolve([]);
				if (endpoint.includes("plugins/install")) return new Promise(() => {}); // Never resolves
				return Promise.reject(new Error("Unknown endpoint"));
			});

			render(
				<MemoryRouter>
					<Databases />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Install Dokku Plugin")).toBeInTheDocument();
			});

			const repoInput = screen.getByPlaceholderText("Repository URL or owner/repo");
			await user.type(repoInput, "dokku/dokku-postgres");

			const installButton = screen.getByText("Install Plugin").closest("button");
			await user.click(installButton!);

			await waitFor(() => {
				expect(installButton).toBeDisabled();
			});
		});

		it("should disable link button during database linking", async () => {
			const user = userEvent.setup();
			let linkResolver: () => void;
			const linkPromise = new Promise<void>((resolve) => {
				linkResolver = resolve;
			});

			apiFetchMock.mockImplementation((endpoint: string, _schema?: any, options?: any) => {
				if (endpoint === "/databases") return Promise.resolve(mockDatabases);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				if (endpoint.includes("/link") && options?.method === "POST") {
					return linkPromise;
				}
				return Promise.reject(new Error("Unknown endpoint"));
			});

			render(
				<MemoryRouter>
					<Databases />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("redis-cache")).toBeInTheDocument();
			});

			// Find the link app select for redis-cache (which has no linked apps)
			// The select should be within the redis-cache database section
			const redisSection = screen.getByText("redis-cache").closest(".border.rounded.p-4.mb-4");
			expect(redisSection).toBeInTheDocument();
			if (!redisSection) return;
			const redisSectionEl = redisSection as HTMLElement;

			const linkSelect = redisSectionEl.querySelector("select");
			expect(linkSelect).toBeInTheDocument();
			if (!linkSelect) return;

			await user.selectOptions(linkSelect as HTMLSelectElement, "my-app");
			const linkButton = within(redisSectionEl).getByRole("button", { name: "Link" });
			await waitFor(() => {
				expect(linkButton).not.toBeDisabled();
			});
			await user.click(linkButton);

			await waitFor(() => {
				expect(linkButton).toBeDisabled();
			});

			// Cleanup: resolve pending state update inside act
			await act(async () => {
				linkResolver!();
				await Promise.resolve();
			});
		});

		it("should disable unlink button during unlink operation", async () => {
			const user = userEvent.setup();
			let unlinkResolver: () => void;
			const unlinkPromise = new Promise<void>((resolve) => {
				unlinkResolver = resolve;
			});

			apiFetchMock.mockImplementation((endpoint: string, _schema?: any, options?: any) => {
				if (endpoint === "/databases") return Promise.resolve(mockDatabases);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				if (endpoint.includes("/unlink") && options?.method === "POST") {
					return unlinkPromise;
				}
				return Promise.reject(new Error("Unknown endpoint"));
			});

			render(
				<MemoryRouter>
					<Databases />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("postgres-test-db")).toBeInTheDocument();
			});

			const unlinkButtons = screen.getAllByText("Unlink");
			await user.click(unlinkButtons[0]);

			await waitFor(() => {
				expect(screen.getByText("Confirm Unlink")).toBeInTheDocument();
			});

			const unlinkDialog = screen.getByText("Confirm Unlink").closest(".bg-white");
			expect(unlinkDialog).toBeInTheDocument();
			if (!unlinkDialog) return;
			const unlinkDialogEl = unlinkDialog as HTMLElement;
			const confirmButton = within(unlinkDialogEl).getByRole("button", { name: "Unlink" });

			// Click the confirm button
			await user.click(confirmButton);

			// The dialog should stay open during the operation
			await waitFor(
				() => {
					expect(within(unlinkDialogEl).getByRole("button", { name: /Unlink/ })).toBeDisabled();
				},
				{ timeout: 3000 }
			);

			// Cleanup: resolve pending state update inside act
			await act(async () => {
				unlinkResolver!();
				await Promise.resolve();
			});
		});

		it("should disable destroy button during destroy operation", async () => {
			const user = userEvent.setup();
			apiFetchMock.mockImplementation((endpoint: string) => {
				if (endpoint === "/databases") return Promise.resolve(mockDatabases);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				if (
					endpoint === "/databases/postgres-test-db" &&
					!endpoint.includes("/link") &&
					!endpoint.includes("/unlink")
				) {
					return new Promise(() => {}); // Never resolves
				}
				return Promise.reject(new Error("Unknown endpoint"));
			});

			render(
				<MemoryRouter>
					<Databases />
				</MemoryRouter>
			);

			await waitFor(() => {
				const destroyButtons = screen.getAllByText("Destroy Database");
				expect(destroyButtons.length).toBeGreaterThan(0);
			});

			const destroyButtons = screen.getAllByText("Destroy Database");
			await user.click(destroyButtons[0]);

			await waitFor(() => {
				expect(screen.getByText("Confirm Destroy")).toBeInTheDocument();
			});

			const confirmInput = screen.getByPlaceholderText(/postgres-test-db/);
			await user.type(confirmInput, "postgres-test-db");

			const destroyButton = screen.getByText("Destroy").closest("button");
			await user.click(destroyButton!);

			await waitFor(() => {
				expect(destroyButton).toBeDisabled();
			});
		});
	});
});
