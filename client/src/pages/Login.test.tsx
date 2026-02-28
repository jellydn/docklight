import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
	});

	it("should render the login form", () => {
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>,
		);

		expect(screen.getByText("Docklight Login")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
	});

	it("should show error message on failed login", async () => {
		apiFetchMock.mockRejectedValue(new Error("Invalid password"));

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>,
		);

		const passwordInput = screen.getByLabelText("Password");
		const loginButton = screen.getByRole("button", { name: "Login" });

		await user.type(passwordInput, "wrong-password");
		await user.click(loginButton);

		await vi.waitFor(() => {
			expect(screen.getByText("Invalid password")).toBeInTheDocument();
		});
	});

	it("should clear error when user starts typing", async () => {
		apiFetchMock.mockRejectedValue(new Error("Invalid password"));

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>,
		);

		const passwordInput = screen.getByLabelText("Password");
		const loginButton = screen.getByRole("button", { name: "Login" });

		await user.type(passwordInput, "wrong");
		await user.click(loginButton);

		await vi.waitFor(() => {
			expect(screen.getByText("Invalid password")).toBeInTheDocument();
		});

		await user.clear(passwordInput);
		await user.type(passwordInput, "new");

		await vi.waitFor(() => {
			expect(screen.queryByText("Invalid password")).not.toBeInTheDocument();
		});
	});

	it("should submit password on successful login", async () => {
		apiFetchMock.mockResolvedValue({ success: true });

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>,
		);

		const passwordInput = screen.getByLabelText("Password");
		const loginButton = screen.getByRole("button", { name: "Login" });

		await user.type(passwordInput, "correct-password");
		await user.click(loginButton);

		await vi.waitFor(() => {
			expect(apiFetchMock).toHaveBeenCalledWith(
				"/auth/login",
				expect.any(Object),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ password: "correct-password" }),
				}),
			);
		});
	});
});
