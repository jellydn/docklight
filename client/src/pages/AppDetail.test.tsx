import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppDetail } from "./AppDetail";
import type { AppDetail as AppDetailData } from "../lib/schemas.js";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

vi.mock("../lib/logger.js", () => ({
	logger: {
		error: vi.fn(),
	},
}));

const mockToastContext = {
	addToast: vi.fn(),
};

vi.mock("../components/ToastProvider", () => ({
	useToast: () => mockToastContext,
}));

const mockAppDetail: AppDetailData = {
	name: "test-app",
	status: "running",
	gitRemote: "dokku@test-app.example.com",
	domains: ["test-app.example.com"],
	processes: { web: 1, worker: 2 },
};

describe("AppDetail", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as any;
	});

	it("should render loading state", () => {
		apiFetchMock.mockImplementation(() => new Promise(() => {}));

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		const spinner = document.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	it("should render app detail", async () => {
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("test-app")).toBeInTheDocument();
			const runningBadges = screen.getAllByText("running");
			expect(runningBadges.length).toBeGreaterThan(0);
		});
	});

	it("should render error state", async () => {
		apiFetchMock.mockRejectedValue(new Error("App not found"));

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("App not found")).toBeInTheDocument();
		});
	});

	it("should display tabs for navigation", async () => {
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const overviewTabs = screen.getAllByText("Overview");
			expect(overviewTabs.length).toBeGreaterThan(0);
			expect(screen.getByText("Config")).toBeInTheDocument();
			expect(screen.getByText("Domains")).toBeInTheDocument();
			expect(screen.getByText("Logs")).toBeInTheDocument();
			expect(screen.getByText("SSL")).toBeInTheDocument();
		});
	});

	it("should show stop button for running apps", async () => {
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Stop")).toBeInTheDocument();
			expect(screen.queryByText("Start")).not.toBeInTheDocument();
		});
	});

	it("should show start button for stopped apps", async () => {
		const stoppedApp = { ...mockAppDetail, status: "stopped" as const };
		apiFetchMock.mockResolvedValue(stoppedApp);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Start")).toBeInTheDocument();
			expect(screen.queryByText("Stop")).not.toBeInTheDocument();
		});
	});

	it("should open confirm dialog when restart is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Restart")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Restart"));

		await vi.waitFor(() => {
			const confirmHeading = screen.getByText("Confirm Action");
			expect(confirmHeading).toBeInTheDocument();
			expect(confirmHeading.parentElement).toHaveTextContent(
				"Are you sure you want to restart test-app?",
			);
		});
	});

	it("should display processes with scale controls", async () => {
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText(/processes/i)).toBeInTheDocument();
			expect(screen.getByText("web")).toBeInTheDocument();
			expect(screen.getByText("worker")).toBeInTheDocument();
		});
	});

	it("should show danger zone with delete button", async () => {
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("Danger Zone")).toBeInTheDocument();
			expect(screen.getByText("Delete App")).toBeInTheDocument();
		});
	});

	it("should open delete dialog when delete button is clicked", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const deleteButtons = screen.getAllByText("Delete App");
			expect(deleteButtons.length).toBeGreaterThan(0);
		});

		const deleteButtons = screen.getAllByText("Delete App");
		await user.click(deleteButtons[0]);

		await vi.waitFor(() => {
			expect(
				screen.getByRole("heading", {
					name: "Delete App",
				}),
			).toBeInTheDocument();
			expect(screen.getByText(/and all its data will be permanently deleted/i)).toBeInTheDocument();
		});
	});

	it("should switch between tabs", async () => {
		const user = userEvent.setup();
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			const overviewTabs = screen.getAllByText("Overview");
			expect(overviewTabs.length).toBeGreaterThan(0);
		});

		await user.click(screen.getByText("Config"));

		await vi.waitFor(() => {
			expect(screen.getByText("Environment Variables")).toBeInTheDocument();
		});
	});

	it("should display git remote information", async () => {
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText(/git remote/i)).toBeInTheDocument();
			expect(screen.getByText("dokku@test-app.example.com")).toBeInTheDocument();
		});
	});

	it("should display domains", async () => {
		apiFetchMock.mockResolvedValue(mockAppDetail);

		render(
			<MemoryRouter initialEntries={["/apps/test-app"]}>
				<Routes>
					<Route path="/apps/:name" element={<AppDetail />} />
				</Routes>
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("test-app.example.com")).toBeInTheDocument();
		});
	});
});
