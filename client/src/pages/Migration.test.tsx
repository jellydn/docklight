import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api.js";
import { Migration } from "./Migration.js";

vi.mock("@/lib/api.js", () => ({ apiFetch: vi.fn() }));
const summary = { configured: true, sourceConfigured: true, revision: "revision" };
function renderPage(): void {
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
		>
			<MemoryRouter>
				<Migration />
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe("migration planning UI", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(apiFetch).mockResolvedValue(summary);
	});
	it("loads only saved state, does not contact a VPS automatically and has no sync action", async () => {
		renderPage();
		await screen.findByText(/saved \(hidden\)/);
		expect(apiFetch).toHaveBeenCalledTimes(1);
		expect(apiFetch).toHaveBeenCalledWith("/migration/destination", expect.anything());
		expect(screen.getByText("Sync is not available yet.")).toBeInTheDocument();
	});
	it("keeps input private, sends no key content and clears it after saving", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText(/saved \(hidden\)/);
		const target = screen.getByLabelText("Destination SSH target");
		expect(target).toHaveAttribute("type", "password");
		await user.type(target, "operator@destination.invalid");
		await user.type(screen.getByLabelText("Verified SHA256 host fingerprint"), "synthetic-pin");
		await user.click(screen.getByRole("button", { name: "Save destination" }));
		await screen.findByText(/Destination saved/);
		expect(target).toHaveValue("");
		expect(screen.getByLabelText("Verified SHA256 host fingerprint")).toHaveValue("");
		expect(apiFetch).toHaveBeenCalledWith(
			"/migration/destination",
			expect.anything(),
			expect.objectContaining({
				method: "PUT",
				headers: { "X-Docklight-Migration": "1" },
				body: JSON.stringify({
					target: "operator@destination.invalid",
					fingerprint: "synthetic-pin",
				}),
			})
		);
	});
	it("selects one app and shows a blocked sanitized preview", async () => {
		const user = userEvent.setup();
		vi.mocked(apiFetch).mockImplementation(async (path) =>
			path === "/migration/apps"
				? { apps: ["pilot", "other"] }
				: path === "/migration/preview"
					? {
							app: "pilot",
							destinationRevision: "revision",
							readyForSync: false,
							configKeyCount: 3,
							databaseServiceCount: 1,
							sharedServiceCount: 1,
							failedChecks: 0,
							blockers: ["Shared database services require an approved dependency strategy."],
						}
					: (summary as never)
		);
		renderPage();
		await screen.findByText(/saved \(hidden\)/);
		await user.click(screen.getByRole("button", { name: "Load source apps" }));
		await screen.findByText(/Source apps loaded/);
		await user.selectOptions(screen.getByLabelText("Source app"), "pilot");
		await user.click(screen.getByRole("button", { name: "Build read-only preview" }));
		await screen.findByText("Preview: pilot");
		expect(screen.getByRole("button", { name: "Sync blocked" })).toBeDisabled();
		expect(screen.getByText(/3 config keys/)).toBeInTheDocument();
	});
	it("cancels a read-only request and never renders raw errors", async () => {
		const user = userEvent.setup();
		vi.mocked(apiFetch).mockImplementation(async (path, _schema, options) => {
			if (path !== "/migration/test") return summary as never;
			return new Promise((_resolve, reject) =>
				options?.signal?.addEventListener("abort", () =>
					reject(new Error("private-config destination.invalid"))
				)
			);
		});
		renderPage();
		await screen.findByText(/saved \(hidden\)/);
		await user.click(screen.getByRole("button", { name: "Test pinned connections" }));
		await user.click(screen.getByRole("button", { name: "Cancel checks" }));
		await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Request cancelled"));
		expect(screen.queryByText(/private-config|destination.invalid/)).not.toBeInTheDocument();
	});
});
