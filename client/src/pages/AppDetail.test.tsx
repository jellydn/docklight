import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDetail as AppDetailData } from "../lib/schemas.js";
import { AppDetail } from "./AppDetail";

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
			</MemoryRouter>
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Restart")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Restart"));

		await waitFor(() => {
			const confirmHeading = screen.getByText("Confirm Action");
			expect(confirmHeading).toBeInTheDocument();
			expect(confirmHeading.parentElement).toHaveTextContent(
				"Are you sure you want to restart test-app?"
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
			const deleteButtons = screen.getAllByText("Delete App");
			expect(deleteButtons.length).toBeGreaterThan(0);
		});

		const deleteButtons = screen.getAllByText("Delete App");
		await user.click(deleteButtons[0]);

		await waitFor(() => {
			expect(
				screen.getByRole("heading", {
					name: "Delete App",
				})
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
			</MemoryRouter>
		);

		await waitFor(() => {
			const overviewTabs = screen.getAllByText("Overview");
			expect(overviewTabs.length).toBeGreaterThan(0);
		});

		await user.click(screen.getByText("Config"));

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
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
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("test-app.example.com")).toBeInTheDocument();
		});
	});

	describe("with submitting states", () => {
		it("should disable confirm button during restart action", async () => {
			const user = userEvent.setup();
			let resolveAction: (value: any) => void;
			const pendingPromise = new Promise((resolve) => {
				resolveAction = resolve;
			});

			apiFetchMock.mockImplementation((_endpoint: string, _schema?: any, options?: any) => {
				if (options?.method === "POST") {
					return pendingPromise;
				}
				return Promise.resolve(mockAppDetail);
			});

			render(
				<MemoryRouter initialEntries={["/apps/test-app"]}>
					<Routes>
						<Route path="/apps/:name" element={<AppDetail />} />
					</Routes>
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Restart")).toBeInTheDocument();
			});

			await user.click(screen.getByText("Restart"));
			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			await user.click(confirmButton);

			await waitFor(() => {
				expect(confirmButton).toBeDisabled();
			});

			// Cleanup: resolve pending state update inside act
			await act(async () => {
				resolveAction!({ exitCode: 0, stdout: "", stderr: "" });
				await Promise.resolve();
			});
		});

		it("should disable scale form during scale operation", async () => {
			const user = userEvent.setup();
			let resolveAction: (value: any) => void;
			const pendingPromise = new Promise((resolve) => {
				resolveAction = resolve;
			});

			apiFetchMock.mockImplementation((endpoint: string, _schema?: any, options?: any) => {
				if (endpoint.includes("/scale") && options?.method === "POST") {
					return pendingPromise;
				}
				return Promise.resolve(mockAppDetail);
			});

			render(
				<MemoryRouter initialEntries={["/apps/test-app"]}>
					<Routes>
						<Route path="/apps/:name" element={<AppDetail />} />
					</Routes>
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText(/processes/i)).toBeInTheDocument();
			});

			const countInputs = screen.getAllByRole("spinbutton");
			await user.clear(countInputs[0]);
			await user.type(countInputs[0], "2");
			await user.click(screen.getByText("Apply Scaling"));
			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			await user.click(confirmButton);

			await waitFor(() => {
				expect(confirmButton).toBeDisabled();
			});

			// Cleanup: resolve pending state update inside act
			await act(async () => {
				resolveAction!({ exitCode: 0, stdout: "", stderr: "" });
				await Promise.resolve();
			});
		});

		it("should disable config var set button during submission", async () => {
			const user = userEvent.setup();
			let configResolver: () => void;
			const configPromise = new Promise<void>((resolve) => {
				configResolver = resolve;
			});

			apiFetchMock.mockImplementation((endpoint: string, _schema?: any, options?: any) => {
				if (endpoint.includes("config") && options?.method === "POST") {
					return configPromise;
				}
				return Promise.resolve(mockAppDetail);
			});

			render(
				<MemoryRouter initialEntries={["/apps/test-app"]}>
					<Routes>
						<Route path="/apps/:name" element={<AppDetail />} />
					</Routes>
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Config")).toBeInTheDocument();
			});

			await user.click(screen.getByText("Config"));

			await waitFor(() => {
				expect(screen.getByText("Environment Variables")).toBeInTheDocument();
			});

			const keyInput = screen.getByPlaceholderText("Key");
			const valueInput = screen.getByPlaceholderText("Value");

			await user.type(keyInput, "TEST_KEY");
			await user.type(valueInput, "test-value");

			const setButton = screen.getByText("Set").closest("button");
			await user.click(setButton!);

			await waitFor(() => {
				expect(setButton).toBeDisabled();
			});

			// Cleanup: resolve pending state update inside act
			await act(async () => {
				configResolver!();
				await Promise.resolve();
			});
		});

		it("should disable add domain button during submission", async () => {
			const user = userEvent.setup();
			apiFetchMock.mockImplementation((endpoint: string, _schema?: any, options?: any) => {
				if (endpoint.includes("domains") && options?.method === "POST") {
					return new Promise(() => {}); // Never resolves
				}
				return Promise.resolve(mockAppDetail);
			});

			render(
				<MemoryRouter initialEntries={["/apps/test-app"]}>
					<Routes>
						<Route path="/apps/:name" element={<AppDetail />} />
					</Routes>
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Domains")).toBeInTheDocument();
			});

			await user.click(screen.getByText("Domains"));

			await waitFor(() => {
				expect(screen.getByPlaceholderText("example.com")).toBeInTheDocument();
			});

			const domainInput = screen.getByPlaceholderText("example.com");
			await user.type(domainInput, "test.example.com");

			const addButton = screen.getByText("Add").closest("button");
			await user.click(addButton!);

			await waitFor(() => {
				expect(addButton).toBeDisabled();
			});
		});
	});
});
