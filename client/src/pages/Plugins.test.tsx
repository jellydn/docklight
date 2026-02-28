import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Plugins } from "./Plugins.js";
import type { PluginInfo } from "../lib/schemas.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockToastContext = {
	addToast: vi.fn(),
};

vi.mock("../components/ToastProvider.js", () => ({
	useToast: () => mockToastContext,
}));

const mockPlugins: PluginInfo[] = [
	{
		name: "dokku-postgres",
		enabled: true,
		version: "1.0.0",
	},
	{
		name: "dokku-redis",
		enabled: false,
		version: "0.5.0",
	},
	{
		name: "custom-plugin",
		enabled: true,
		version: undefined,
	},
];

describe("Plugins", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Mock window.confirm
		global.confirm = vi.fn(() => true) as any;
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as any;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		const spinner = document.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	it("should render plugins page", async () => {
		apiFetchMock.mockResolvedValue(mockPlugins);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Plugins")).toBeInTheDocument();
		});
	});

	it("should render empty state when no plugins", async () => {
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("No plugins found")).toBeInTheDocument();
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to load plugins"));

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Failed to load plugins")).toBeInTheDocument();
		});
	});

	it("should display install plugin form", async () => {
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Install Plugin")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Repository URL or owner/repo")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Plugin name (optional)")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Sudo password (optional)")).toBeInTheDocument();
		});
	});

	it("should display installed plugins", async () => {
		apiFetchMock.mockResolvedValue(mockPlugins);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Installed Plugins")).toBeInTheDocument();
			expect(screen.getByText("dokku-postgres")).toBeInTheDocument();
			expect(screen.getByText("dokku-redis")).toBeInTheDocument();
			expect(screen.getByText("custom-plugin")).toBeInTheDocument();
		});
	});

	it("should display plugin status and version", async () => {
		apiFetchMock.mockResolvedValue(mockPlugins);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			// The enabled plugin with version shows "Status: Enabled • v1.0.0"
			const enabledStatusElements = screen.getAllByText(/Status: Enabled/);
			expect(enabledStatusElements.length).toBeGreaterThan(0);
			expect(screen.getByText(/Status:\s*Disabled/)).toBeInTheDocument();
			expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
			expect(screen.getByText(/v0\.5\.0/)).toBeInTheDocument();
		});
	});

	it("should show disable button for enabled plugins", async () => {
		apiFetchMock.mockResolvedValue(mockPlugins);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const disableButtons = screen.getAllByText("Disable");
			expect(disableButtons.length).toBeGreaterThan(0);
		});
	});

	it("should show enable button for disabled plugins", async () => {
		apiFetchMock.mockResolvedValue(mockPlugins);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const enableButtons = screen.getAllByText("Enable");
			expect(enableButtons.length).toBeGreaterThan(0);
		});
	});

	it("should show uninstall button for all plugins", async () => {
		apiFetchMock.mockResolvedValue(mockPlugins);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const uninstallButtons = screen.getAllByText("Uninstall");
			expect(uninstallButtons.length).toBe(3);
		});
	});

	it("should display popular plugin quick install buttons", async () => {
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Postgres")).toBeInTheDocument();
			expect(screen.getByText("Redis")).toBeInTheDocument();
			expect(screen.getByText("MySQL")).toBeInTheDocument();
			expect(screen.getByText("MariaDB")).toBeInTheDocument();
			expect(screen.getByText("Mongo")).toBeInTheDocument();
		});
	});

	it("should fill form when popular plugin button is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Postgres")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Postgres"));

		await vi.waitFor(() => {
			const repoInput = screen.getByPlaceholderText("Repository URL or owner/repo");
			const nameInput = screen.getByPlaceholderText("Plugin name (optional)");
			expect(repoInput).toHaveValue("dokku/dokku-postgres");
			expect(nameInput).toHaveValue("dokku-postgres");
		});
	});

	it("should disable install button when repo is empty", async () => {
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const installButton = screen.getByText("Install").closest("button");
			expect(installButton).toBeDisabled();
		});
	});

	it("should enable install button when repo is filled", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<Plugins />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const installButton = screen.getByText("Install").closest("button");
			expect(installButton).toBeDisabled();
		});

		const repoInput = screen.getByPlaceholderText("Repository URL or owner/repo");
		await user.type(repoInput, "dokku/dokku-postgres");

		await vi.waitFor(() => {
			const installButton = screen.getByText("Install").closest("button");
			expect(installButton).not.toBeDisabled();
		});
	});
});
