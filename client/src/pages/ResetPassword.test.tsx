import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/theme-context.js";
import { ResetPassword } from "./ResetPassword";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

const mockToastContext = {
	addToast: vi.fn(),
	removeToast: vi.fn(),
};

vi.mock("../components/ToastProvider", () => ({
	useToast: () => mockToastContext,
}));

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const renderWithQueryClientAndParams = (initialEntries: string[]) => {
	const testQueryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={testQueryClient}>
			<ThemeProvider>
				<MemoryRouter initialEntries={initialEntries}>
					<Routes>
						<Route path="/reset-password" element={<ResetPassword />} />
						<Route path="/login" element={<div>Mock Login Page</div>} />
					</Routes>
				</MemoryRouter>
			</ThemeProvider>
		</QueryClientProvider>
	);
};

describe("ResetPassword", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as MockedFunction<typeof apiFetch>;
	});

	it("should show error if token parameter is missing", async () => {
		renderWithQueryClientAndParams(["/reset-password"]);

		expect(await screen.findByText("Reset Password")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Missing or invalid password reset token. Please request a new link from the login page."
			)
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Back to login" })).toBeInTheDocument();
	});

	it("should render the form with password and confirm fields when token is present", async () => {
		renderWithQueryClientAndParams(["/reset-password?token=secret-token"]);

		expect(await screen.findByText("Reset Password")).toBeInTheDocument();
		expect(screen.getByLabelText("New Password")).toBeInTheDocument();
		expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
	});

	it("should display validation error if passwords do not match", async () => {
		const user = userEvent.setup();
		renderWithQueryClientAndParams(["/reset-password?token=secret-token"]);

		await user.type(screen.getByLabelText("New Password"), "password123");
		await user.type(screen.getByLabelText("Confirm New Password"), "different-password");
		await user.click(screen.getByRole("button", { name: "Reset password" }));

		expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
		expect(apiFetchMock).not.toHaveBeenCalled();
	});

	it("should submit password reset request and navigate to login on success", async () => {
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/reset-password") {
				return Promise.resolve({ success: true });
			}
			return Promise.reject(new Error("Not found"));
		});

		const user = userEvent.setup();
		renderWithQueryClientAndParams(["/reset-password?token=secret-token"]);

		await user.type(screen.getByLabelText("New Password"), "password123");
		await user.type(screen.getByLabelText("Confirm New Password"), "password123");
		await user.click(screen.getByRole("button", { name: "Reset password" }));

		await waitFor(() => {
			expect(apiFetchMock).toHaveBeenCalledWith(
				"/auth/reset-password",
				expect.any(Object),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ token: "secret-token", password: "password123" }),
				})
			);
			expect(mockToastContext.addToast).toHaveBeenCalledWith(
				"success",
				expect.stringContaining("successfully")
			);
			expect(screen.getByText("Mock Login Page")).toBeInTheDocument();
		});
	});

	it("should display error toast on failed reset request", async () => {
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/reset-password") {
				return Promise.reject(new Error("Token has expired"));
			}
			return Promise.reject(new Error("Not found"));
		});

		const user = userEvent.setup();
		renderWithQueryClientAndParams(["/reset-password?token=expired-token"]);

		await user.type(screen.getByLabelText("New Password"), "password123");
		await user.type(screen.getByLabelText("Confirm New Password"), "password123");
		await user.click(screen.getByRole("button", { name: "Reset password" }));

		await waitFor(() => {
			expect(mockToastContext.addToast).toHaveBeenCalledWith("error", "Token has expired");
			expect(screen.getByText("Token has expired")).toBeInTheDocument();
		});
	});
});
