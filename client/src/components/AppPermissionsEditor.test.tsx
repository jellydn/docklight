import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppPermissionsEditor } from "./AppPermissionsEditor";

vi.mock("../lib/api.js", () => ({ apiFetch: vi.fn() }));
import { apiFetch } from "../lib/api.js";

function renderEditor(onClose = vi.fn()): void {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={queryClient}>
			<AppPermissionsEditor
				user={{
					id: 2,
					username: "operator",
					email: null,
					role: "operator",
					createdAt: "2026-01-01T00:00:00Z",
				}}
				onClose={onClose}
			/>
		</QueryClientProvider>
	);
}

describe("AppPermissionsEditor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(apiFetch).mockImplementation(
			(_path: string, _schema: unknown, options?: RequestInit) => {
				if (!options) return Promise.resolve([]);
				return Promise.resolve([
					{
						id: 1,
						userId: 2,
						resource: "apps",
						action: "delete",
						scope: "production",
						effect: "deny",
						createdAt: "2026-01-01T00:00:00Z",
					},
				]);
			}
		);
	});

	it("adds and saves a scoped app rule", async () => {
		const user = userEvent.setup();
		renderEditor();

		await user.click(await screen.findByRole("button", { name: "Add rule" }));
		await user.selectOptions(screen.getByLabelText("Action 1"), "delete");
		await user.selectOptions(screen.getByLabelText("Effect 1"), "deny");
		await user.type(screen.getByLabelText("App scope 1"), "production");
		await user.click(screen.getByRole("button", { name: "Save permissions" }));

		await waitFor(() => {
			expect(apiFetch).toHaveBeenLastCalledWith(
				"/users/2/permissions",
				expect.any(Object),
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify({
						permissions: [{ action: "delete", effect: "deny", scope: "production" }],
					}),
				})
			);
		});
	});
});
