import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "./Login";

vi.mock("../lib/api.js", () => ({
	apiFetch: vi.fn(),
}));

describe("Login", () => {
	let apiFetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { apiFetch } = await import("../lib/api.js");
		apiFetchMock = apiFetch as MockedFunction<typeof apiFetch>;
		// Default: auth/me fails (not logged in)
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/me") return Promise.reject(new Error("Unauthorized"));
			return Promise.reject(new Error("Not found"));
		});
	});

	it("should render the login form with username and password fields", async () => {
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		expect(await screen.findByText("Docklight Login")).toBeInTheDocument();
		expect(screen.getByLabelText("Username")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
	});

	it("should show error message on failed login", async () => {
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/me") return Promise.reject(new Error("Unauthorized"));
			if (path === "/auth/login") return Promise.reject(new Error("Invalid credentials"));
			return Promise.reject(new Error("Not found"));
		});

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		await screen.findByText("Docklight Login");
		const usernameInput = screen.getByLabelText("Username");
		const passwordInput = screen.getByLabelText("Password");
		const loginButton = screen.getByRole("button", { name: "Login" });

		await user.type(usernameInput, "testuser");
		await user.type(passwordInput, "wrong-password");
		await user.click(loginButton);

		await waitFor(() => {
			expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
		});
	});

	it("should submit credentials on successful login", async () => {
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/me") return Promise.reject(new Error("Unauthorized"));
			if (path === "/auth/login") return Promise.resolve({ success: true });
			return Promise.reject(new Error("Not found"));
		});

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		await screen.findByText("Docklight Login");
		const usernameInput = screen.getByLabelText("Username");
		const passwordInput = screen.getByLabelText("Password");
		const loginButton = screen.getByRole("button", { name: "Login" });

		await user.type(usernameInput, "testuser");
		await user.type(passwordInput, "correct-password");
		await user.click(loginButton);

		await waitFor(() => {
			expect(apiFetchMock).toHaveBeenCalledWith(
				"/auth/login",
				expect.any(Object),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ username: "testuser", password: "correct-password" }),
				})
			);
		});
	});
});
