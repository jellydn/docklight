import { describe, it, expect, vi, beforeEach } from "vitest";
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
		apiFetchMock = apiFetch as any;
		// Default: auth/me fails (not logged in) and mode is legacy (no multi-user)
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/me") return Promise.reject(new Error("Unauthorized"));
			if (path === "/auth/mode") return Promise.resolve({ multiUser: false });
			return Promise.reject(new Error("Not found"));
		});
	});

	it("should render the login form", async () => {
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		expect(await screen.findByText("Docklight Login")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
	});

	it("should show username field in multi-user mode", async () => {
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/me") return Promise.reject(new Error("Unauthorized"));
			if (path === "/auth/mode") return Promise.resolve({ multiUser: true });
			return Promise.reject(new Error("Not found"));
		});

		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		expect(await screen.findByLabelText("Username")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
	});

	it("should show error message on failed login", async () => {
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/me") return Promise.reject(new Error("Unauthorized"));
			if (path === "/auth/mode") return Promise.resolve({ multiUser: false });
			if (path === "/auth/login") return Promise.reject(new Error("Invalid password"));
			return Promise.reject(new Error("Not found"));
		});

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		await screen.findByText("Docklight Login");
		const passwordInput = screen.getByLabelText("Password");
		const loginButton = screen.getByRole("button", { name: "Login" });

		await user.type(passwordInput, "wrong-password");
		await user.click(loginButton);

		await waitFor(() => {
			expect(screen.getByText("Invalid password")).toBeInTheDocument();
		});
	});

	it("should submit password on successful legacy login", async () => {
		apiFetchMock.mockImplementation((path: string) => {
			if (path === "/auth/me") return Promise.reject(new Error("Unauthorized"));
			if (path === "/auth/mode") return Promise.resolve({ multiUser: false });
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
		const passwordInput = screen.getByLabelText("Password");
		const loginButton = screen.getByRole("button", { name: "Login" });

		await user.type(passwordInput, "correct-password");
		await user.click(loginButton);

		await waitFor(() => {
			expect(apiFetchMock).toHaveBeenCalledWith(
				"/auth/login",
				expect.any(Object),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ password: "correct-password" }),
				})
			);
		});
	});
});

