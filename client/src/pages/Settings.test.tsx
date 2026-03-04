import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerSettings } from "../lib/schemas.js";
import { Settings } from "./Settings.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockSettings: ServerSettings = {
	dokkuSshTarget: "dokku@192.168.1.1",
	dokkuSshKeyPath: "/app/.ssh/id_ed25519",
	logLevel: "info",
};

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
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

describe("Settings", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as ReturnType<typeof vi.fn>;
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		renderWithProviders(<Settings />);

		expect(screen.getByText("Loading…")).toBeInTheDocument();
	});

	it("should render settings form after load", async () => {
		apiFetchMock.mockResolvedValue(mockSettings);

		renderWithProviders(<Settings />);

		await waitFor(() => {
			expect(screen.getByLabelText("SSH Target")).toBeInTheDocument();
			expect(screen.getByLabelText("SSH Key Path")).toBeInTheDocument();
			expect(screen.getByLabelText("Log Level")).toBeInTheDocument();
		});
	});

	it("should populate form with loaded settings", async () => {
		apiFetchMock.mockResolvedValue(mockSettings);

		renderWithProviders(<Settings />);

		await waitFor(() => {
			const sshTarget = screen.getByLabelText("SSH Target") as HTMLInputElement;
			expect(sshTarget.value).toBe("dokku@192.168.1.1");
		});
	});

	it("should show error state when fetch fails", async () => {
		apiFetchMock.mockRejectedValue(new Error("Network error"));

		renderWithProviders(<Settings />);

		await waitFor(() => {
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});
	});

	it("should show success message after save", async () => {
		apiFetchMock
			.mockResolvedValueOnce(mockSettings)
			.mockResolvedValueOnce({ ...mockSettings, logLevel: "debug" });

		const user = userEvent.setup();
		renderWithProviders(<Settings />);

		await waitFor(() => {
			expect(screen.getByLabelText("Log Level")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Save Settings" }));

		await waitFor(() => {
			expect(screen.getByText("Settings saved successfully.")).toBeInTheDocument();
		});
	});

	it("should show error message when save fails", async () => {
		apiFetchMock
			.mockResolvedValueOnce(mockSettings)
			.mockRejectedValueOnce(new Error("Save failed"));

		const user = userEvent.setup();
		renderWithProviders(<Settings />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Save Settings" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Save Settings" }));

		await waitFor(() => {
			expect(screen.getByText("Save failed")).toBeInTheDocument();
		});
	});

	it("should have a Save Settings button", async () => {
		apiFetchMock.mockResolvedValue(mockSettings);

		renderWithProviders(<Settings />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Save Settings" })).toBeInTheDocument();
		});
	});
});
