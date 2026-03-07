import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Databases } from "./Databases.js";
import type { Database, App } from "../lib/schemas.js";

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

		renderWithQueryClient(
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

		renderWithQueryClient(
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

		renderWithQueryClient(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Failed to load data")).toBeInTheDocument();
		});
	});

	it("should display install plugin guide when no databases", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve([]);
			if (endpoint === "/apps") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Install a Database Plugin")).toBeInTheDocument();
			expect(
				screen.getByText(/Run one of these commands on your Dokku server/)
			).toBeInTheDocument();
		});
	});

	it("should display create database form", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve([]);
			if (endpoint === "/apps") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
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

		renderWithQueryClient(
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

		renderWithQueryClient(
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

		renderWithQueryClient(
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

		renderWithQueryClient(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await waitFor(() => {
			const noLinkedApps = screen.getAllByText("No linked apps");
			expect(noLinkedApps.length).toBeGreaterThan(0);
		});
	});

	it("should display plugin install commands", async () => {
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve([]);
			if (endpoint === "/apps") return Promise.resolve([]);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Postgres:")).toBeInTheDocument();
			expect(screen.getByText("Redis:")).toBeInTheDocument();
			expect(screen.getByText("MySQL:")).toBeInTheDocument();
		});
	});

	it("should open unlink confirmation dialog", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.reject(new Error("Unknown endpoint"));
		});

		renderWithQueryClient(
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

		renderWithQueryClient(
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

	it("should hide modification controls for viewer role", async () => {
		mockAuthState.role = "viewer";
		mockAuthState.canModify = false;

		apiFetchMock.mockImplementation((endpoint: string) => {
			if (endpoint === "/databases") return Promise.resolve(mockDatabases);
			if (endpoint === "/apps") return Promise.resolve(mockApps);
			return Promise.resolve([]);
		});

		renderWithQueryClient(
			<MemoryRouter>
				<Databases />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("postgres-test-db")).toBeInTheDocument();
		});

		expect(screen.queryByText("Create New Database")).not.toBeInTheDocument();
		expect(screen.queryByText("Install Dokku Plugin")).not.toBeInTheDocument();
		expect(screen.queryByText("Destroy Database")).not.toBeInTheDocument();
		expect(screen.queryByText("Unlink")).not.toBeInTheDocument();
	});

	describe("with submitting states", () => {
		function mockPendingStream(): { resolve: () => void } {
			let resolveStream: (() => void) | undefined;
			const mockStream = new ReadableStream({
				start(controller) {
					const progress = `data: ${JSON.stringify({ type: "progress", message: "Connecting..." })}\n\n`;
					controller.enqueue(new TextEncoder().encode(progress));
					resolveStream = () => {
						const result = `data: ${JSON.stringify({ type: "result", command: "", exitCode: 0, stdout: "", stderr: "" })}\n\n`;
						controller.enqueue(new TextEncoder().encode(result));
						controller.close();
					};
				},
			});
			vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
				new Response(mockStream, {
					status: 200,
					headers: { "Content-Type": "text/event-stream" },
				})
			);
			return { resolve: () => resolveStream?.() };
		}

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should disable create button during database creation", async () => {
			const user = userEvent.setup();
			apiFetchMock.mockImplementation((endpoint: string) => {
				if (endpoint === "/databases") return Promise.resolve([]);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				return Promise.reject(new Error("Unknown endpoint"));
			});

			renderWithQueryClient(
				<MemoryRouter>
					<Databases />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Create New Database")).toBeInTheDocument();
			});

			const selectElement = screen.getByText("Select plugin").closest("select");
			await user.selectOptions(selectElement!, "postgres");

			const nameInput = screen.getByPlaceholderText("Database name");
			await user.type(nameInput, "test-db");

			const { resolve } = mockPendingStream();

			const createButton = screen.getByText("Create").closest("button");
			await user.click(createButton!);

			await waitFor(() => {
				expect(createButton).toBeDisabled();
			});

			await act(async () => {
				resolve();
				await Promise.resolve();
			});
		});

		it("should disable link button during database linking", async () => {
			const user = userEvent.setup();
			apiFetchMock.mockImplementation((endpoint: string) => {
				if (endpoint === "/databases") return Promise.resolve(mockDatabases);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				return Promise.reject(new Error("Unknown endpoint"));
			});

			renderWithQueryClient(
				<MemoryRouter>
					<Databases />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("redis-cache")).toBeInTheDocument();
			});

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

			const { resolve } = mockPendingStream();
			await user.click(linkButton);

			await waitFor(() => {
				expect(linkButton).toBeDisabled();
			});

			await act(async () => {
				resolve();
				await Promise.resolve();
			});
		});

		it("should disable unlink button during unlink operation", async () => {
			const user = userEvent.setup();
			apiFetchMock.mockImplementation((endpoint: string) => {
				if (endpoint === "/databases") return Promise.resolve(mockDatabases);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				return Promise.reject(new Error("Unknown endpoint"));
			});

			renderWithQueryClient(
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

			const { resolve } = mockPendingStream();
			await user.click(confirmButton);

			await waitFor(
				() => {
					expect(within(unlinkDialogEl).getByRole("button", { name: /Unlink/ })).toBeDisabled();
				},
				{ timeout: 3000 }
			);

			await act(async () => {
				resolve();
				await Promise.resolve();
			});
		});

		it("should disable destroy button during destroy operation", async () => {
			const user = userEvent.setup();
			apiFetchMock.mockImplementation((endpoint: string) => {
				if (endpoint === "/databases") return Promise.resolve(mockDatabases);
				if (endpoint === "/apps") return Promise.resolve(mockApps);
				return Promise.reject(new Error("Unknown endpoint"));
			});

			renderWithQueryClient(
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

			const { resolve } = mockPendingStream();

			const destroyButton = screen.getByText("Destroy").closest("button");
			await user.click(destroyButton!);

			await waitFor(() => {
				expect(destroyButton).toBeDisabled();
			});

			await act(async () => {
				resolve();
				await Promise.resolve();
			});
		});
	});
});
