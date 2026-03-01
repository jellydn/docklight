import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerConfig } from "../lib/schemas.js";
import { Settings } from "./Settings.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockConfig: ServerConfig = {
	dokkuSshTarget: "dokku@example.com",
	dokkuSshRootTarget: "root@example.com",
	dokkuSshKeyPath: "/home/user/.ssh/id_rsa",
	dokkuSshOpts: "",
	logLevel: "info",
};

describe("Settings", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as ReturnType<typeof vi.fn>;
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		render(
			<MemoryRouter>
				<Settings />
			</MemoryRouter>
		);

		expect(screen.getByText("Loading…")).toBeInTheDocument();
	});

	it("should render settings form with loaded config", async () => {
		apiFetchMock.mockResolvedValue(mockConfig);

		render(
			<MemoryRouter>
				<Settings />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByLabelText("SSH Target")).toHaveValue("dokku@example.com");
			expect(screen.getByLabelText("Root SSH Target")).toHaveValue("root@example.com");
			expect(screen.getByLabelText("SSH Key Path")).toHaveValue("/home/user/.ssh/id_rsa");
			expect(screen.getByLabelText("Log Level")).toHaveValue("info");
		});
	});

	it("should show error when loading fails", async () => {
		apiFetchMock.mockRejectedValue(new Error("Failed to load configuration"));

		render(
			<MemoryRouter>
				<Settings />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Failed to load configuration")).toBeInTheDocument();
		});
	});

	it("should save settings and show success message", async () => {
		apiFetchMock.mockResolvedValueOnce(mockConfig).mockResolvedValueOnce({
			...mockConfig,
			logLevel: "debug",
		});

		render(
			<MemoryRouter>
				<Settings />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByLabelText("Log Level")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.selectOptions(screen.getByLabelText("Log Level"), "debug");
		await user.click(screen.getByRole("button", { name: "Save Settings" }));

		await waitFor(() => {
			expect(screen.getByText("Settings saved successfully.")).toBeInTheDocument();
		});
	});

	it("should show error when saving fails", async () => {
		apiFetchMock
			.mockResolvedValueOnce(mockConfig)
			.mockRejectedValueOnce(new Error("Failed to save configuration"));

		render(
			<MemoryRouter>
				<Settings />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Save Settings" })).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Save Settings" }));

		await waitFor(() => {
			expect(screen.getByText("Failed to save configuration")).toBeInTheDocument();
		});
	});

	it("should render all log level options", async () => {
		apiFetchMock.mockResolvedValue(mockConfig);

		render(
			<MemoryRouter>
				<Settings />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByLabelText("Log Level")).toBeInTheDocument();
		});

		const select = screen.getByLabelText("Log Level") as HTMLSelectElement;
		const options = Array.from(select.options).map((o) => o.value);
		expect(options).toContain("trace");
		expect(options).toContain("debug");
		expect(options).toContain("info");
		expect(options).toContain("warn");
		expect(options).toContain("error");
	});

	it("should have a Save Settings button", async () => {
		apiFetchMock.mockResolvedValue(mockConfig);

		render(
			<MemoryRouter>
				<Settings />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Save Settings" })).toBeInTheDocument();
		});
	});
});
