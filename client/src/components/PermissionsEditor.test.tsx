import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionsEditor } from "./PermissionsEditor";

vi.mock("../lib/api.js", () => ({ apiFetch: vi.fn() }));
import { apiFetch } from "../lib/api.js";

function renderEditor(onClose = vi.fn()): void {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={queryClient}>
			<PermissionsEditor
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

describe("PermissionsEditor", () => {
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
		await user.type(screen.getByLabelText("Resource scope 1"), "production");
		await user.click(screen.getByRole("button", { name: "Save permissions" }));

		await waitFor(() => {
			expect(apiFetch).toHaveBeenLastCalledWith(
				"/users/2/permissions",
				expect.any(Object),
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify({
						permissions: [
							{ resource: "apps", action: "delete", effect: "deny", scope: "production" },
						],
					}),
				})
			);
		});
	});

	it("saves a database rule and clears a named scope for global configuration", async () => {
		const user = userEvent.setup();
		renderEditor();
		await user.click(await screen.findByRole("button", { name: "Add rule" }));
		await user.selectOptions(screen.getByLabelText("Resource 1"), "databases");
		await user.selectOptions(screen.getByLabelText("Action 1"), "delete");
		await user.type(screen.getByLabelText("Resource scope 1"), "production");
		await user.click(screen.getByRole("button", { name: "Save permissions" }));
		await waitFor(() =>
			expect(apiFetch).toHaveBeenLastCalledWith(
				"/users/2/permissions",
				expect.anything(),
				expect.objectContaining({
					body: JSON.stringify({
						permissions: [
							{ resource: "databases", action: "delete", effect: "deny", scope: "production" },
						],
					}),
				})
			)
		);
		await user.selectOptions(screen.getByLabelText("Resource 1"), "config");
		expect(screen.getByLabelText("Resource scope 1")).toBeDisabled();
		expect(screen.getByLabelText("Resource scope 1")).toHaveValue("");
	});
});
