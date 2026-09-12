import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequireAdmin } from "./RequireAdmin.js";

// Mutable mock state so individual tests can set different roles
let mockRole: string | null = null;
let mockLoading = false;

vi.mock("@/contexts/auth-context.js", () => ({
	useAuth: () => ({ role: mockRole, loading: mockLoading, canModify: false }),
}));

describe("RequireAdmin", () => {
	describe("loading state", () => {
		it("should render loading text when loading is true", () => {
			mockLoading = true;
			mockRole = null;
			render(
				<MemoryRouter>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			expect(screen.getByText("Loading…")).toBeInTheDocument();
		});

		it("should not render children while loading", () => {
			mockLoading = true;
			mockRole = null;
			render(
				<MemoryRouter>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
		});

		it("loading text should use text-muted-foreground class (not text-gray-500)", () => {
			mockLoading = true;
			mockRole = null;
			render(
				<MemoryRouter>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			const loadingEl = screen.getByText("Loading…");
			expect(loadingEl.className).toContain("text-muted-foreground");
			expect(loadingEl.className).not.toContain("text-gray-500");
		});
	});

	describe("access control", () => {
		it("should render children when role is admin", () => {
			mockLoading = false;
			mockRole = "admin";
			render(
				<MemoryRouter>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			expect(screen.getByText("Admin content")).toBeInTheDocument();
		});

		it("should redirect to /dashboard when role is null", () => {
			mockLoading = false;
			mockRole = null;
			const { container } = render(
				<MemoryRouter initialEntries={["/settings"]}>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			// When Navigate is triggered, the children are not rendered
			expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
			// Container should not have the admin content
			expect(container.textContent).not.toContain("Admin content");
		});

		it("should redirect to /dashboard when role is operator", () => {
			mockLoading = false;
			mockRole = "operator";
			render(
				<MemoryRouter initialEntries={["/settings"]}>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
		});

		it("should redirect to /dashboard when role is viewer", () => {
			mockLoading = false;
			mockRole = "viewer";
			render(
				<MemoryRouter initialEntries={["/settings"]}>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
		});

		it("should not show loading when not loading and role is admin", () => {
			mockLoading = false;
			mockRole = "admin";
			render(
				<MemoryRouter>
					<RequireAdmin>
						<div>Admin content</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
		});

		it("should render multiple children when admin", () => {
			mockLoading = false;
			mockRole = "admin";
			render(
				<MemoryRouter>
					<RequireAdmin>
						<div>First</div>
						<div>Second</div>
					</RequireAdmin>
				</MemoryRouter>
			);
			expect(screen.getByText("First")).toBeInTheDocument();
			expect(screen.getByText("Second")).toBeInTheDocument();
		});
	});
});
