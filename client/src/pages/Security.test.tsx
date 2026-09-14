import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/theme-context.js";
import { Security } from "./Security";

vi.mock("../lib/api.js", () => ({ apiFetch: vi.fn() }));

const addToast = vi.fn();
vi.mock("../components/ToastProvider", () => ({
	useToast: () => ({ addToast, removeToast: vi.fn() }),
}));

import { apiFetch } from "../lib/api.js";

function renderPage(): void {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<Security />
			</ThemeProvider>
		</QueryClientProvider>
	);
}

describe("Security", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("enrolls an authenticator and displays one-time recovery codes", async () => {
		vi.mocked(apiFetch).mockImplementation((path: string) => {
			if (path === "/auth/2fa") return Promise.resolve({ enabled: false });
			if (path === "/auth/2fa/setup") {
				return Promise.resolve({ secret: "SECRET", qrCode: "data:image/png;base64,abc" });
			}
			if (path === "/auth/2fa/verify") {
				return Promise.resolve({ enabled: true, recoveryCodes: ["AAAAA-BBBBB", "CCCCC-DDDDD"] });
			}
			return Promise.reject(new Error("Not found"));
		});
		const user = userEvent.setup();

		renderPage();
		await user.click(await screen.findByRole("button", { name: "Set up authenticator" }));
		expect(await screen.findByAltText("Authenticator setup QR code")).toBeInTheDocument();
		expect(screen.getByText("SECRET")).toBeInTheDocument();

		await user.type(screen.getByLabelText("Authenticator code"), "123456");
		await user.click(screen.getByRole("button", { name: "Verify and enable" }));

		expect(await screen.findByText("AAAAA-BBBBB")).toBeInTheDocument();
		expect(screen.getByText("CCCCC-DDDDD")).toBeInTheDocument();
		expect(apiFetch).toHaveBeenCalledWith(
			"/auth/2fa/verify",
			expect.any(Object),
			expect.objectContaining({ body: JSON.stringify({ code: "123456" }) })
		);
	});

	it("requires the current password to disable two-factor authentication", async () => {
		vi.mocked(apiFetch).mockImplementation((path: string) => {
			if (path === "/auth/2fa") return Promise.resolve({ enabled: true });
			if (path === "/auth/2fa/disable") return Promise.resolve({ enabled: false });
			return Promise.reject(new Error("Not found"));
		});
		const user = userEvent.setup();

		renderPage();
		await user.type(
			await screen.findByLabelText("Confirm your password to disable two-factor authentication"),
			"current-password"
		);
		await user.click(screen.getByRole("button", { name: "Disable two-factor authentication" }));

		await waitFor(() => {
			expect(apiFetch).toHaveBeenCalledWith(
				"/auth/2fa/disable",
				expect.any(Object),
				expect.objectContaining({ body: JSON.stringify({ password: "current-password" }) })
			);
		});
	});
});
