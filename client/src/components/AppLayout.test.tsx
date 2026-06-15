import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppLayout } from "./AppLayout";
import { MemoryRouter } from "react-router-dom";

// Mock the apiFetch and logger modules
vi.mock("../lib/api", () => ({
	apiFetch: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
	logger: {
		error: vi.fn(),
	},
}));

vi.mock("@/hooks/use-app-events.js", () => ({
	useAppEvents: vi.fn(),
}));

// Mutable mock state for auth context so tests can control role/username
let mockRole: string | null = null;
let mockUsername: string | null = null;

vi.mock("@/contexts/auth-context.js", () => ({
	useAuth: () => ({ role: mockRole, username: mockUsername, loading: false, canModify: false }),
}));

describe("AppLayout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset auth state to non-admin for each test
		mockRole = null;
		mockUsername = null;
	});

	it("should render the layout with navigation links", () => {
		render(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<AppLayout />
			</MemoryRouter>
		);

		// "Docklight" appears twice (sidebar + mobile header), so use getAllByText
		expect(screen.getAllByText("Docklight")).toHaveLength(2);
		expect(screen.getByText("Dashboard")).toBeInTheDocument();
		expect(screen.getByText("Apps")).toBeInTheDocument();
		expect(screen.getByText("Databases")).toBeInTheDocument();
		expect(screen.getByText("Plugins")).toBeInTheDocument();
		expect(screen.getByText("Logout")).toBeInTheDocument();
	});

	it("should show mobile menu button on small screens", () => {
		render(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<AppLayout />
			</MemoryRouter>
		);

		// Mobile menu button (hamburger)
		const menuButton = screen.getByLabelText("Open menu");
		expect(menuButton).toBeInTheDocument();
	});

	it("should open sidebar when mobile menu button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<AppLayout />
			</MemoryRouter>
		);

		// Initially, the sidebar should be hidden (translated off screen)
		const sidebar = screen.getByRole("complementary") ?? document.querySelector("aside");
		expect(sidebar).toHaveClass("-translate-x-full");

		const menuButton = screen.getByLabelText("Open menu");
		await user.click(menuButton);

		// Sidebar should now be visible
		expect(sidebar).toHaveClass("translate-x-0");
	});

	it("should render child routes through Outlet", () => {
		render(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<AppLayout />
			</MemoryRouter>
		);

		// Outlet renders child content, in this case empty for the test
		// But we can verify the main element exists
		const main = screen.getByRole("main") ?? document.querySelector("main");
		expect(main).toBeInTheDocument();
	});

	describe("isActive (active route highlighting)", () => {
		const activeClass = "bg-white/20";

		it.each([
			["/dashboard", /Dashboard/],
			["/apps", /^Apps$/],
			["/apps/my-app", /^Apps$/],
			["/audit", /Audit Logs/],
			["/databases", /Databases/],
		])("should highlight the %s nav link", (route, namePattern) => {
			render(
				<MemoryRouter initialEntries={[route]}>
					<AppLayout />
				</MemoryRouter>
			);
			const link = screen.getByRole("link", { name: namePattern });
			expect(link.className).toContain(activeClass);
		});

		it.each([
			[/^Apps$/, "bg-white/20 text-white"],
			[/Audit Logs/, "bg-white/20 text-white"],
		])("%s should not have active styling when on /dashboard", (namePattern, notClass) => {
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			const link = screen.getByRole("link", { name: namePattern });
			expect(link.className).not.toContain(notClass);
		});
	});

	describe("admin navigation items", () => {
		it("should show Users and Settings links when role is admin", () => {
			mockRole = "admin";
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			expect(screen.getByRole("link", { name: /Users/ })).toBeInTheDocument();
			expect(screen.getByRole("link", { name: /Settings/ })).toBeInTheDocument();
		});

		it("should not show Users link when role is not admin", () => {
			mockRole = null;
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			expect(screen.queryByRole("link", { name: /Users/ })).not.toBeInTheDocument();
		});

		it("should not show Settings link when role is not admin", () => {
			mockRole = null;
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			expect(screen.queryByRole("link", { name: /^Settings$/ })).not.toBeInTheDocument();
		});

		it("should not show Users link when role is operator", () => {
			mockRole = "operator";
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			expect(screen.queryByRole("link", { name: /Users/ })).not.toBeInTheDocument();
		});

		it.each([
			["/users", /Users/],
			["/settings", /^Settings$/],
		])("should apply bg-white/20 to %s link when role is admin", (route, namePattern) => {
			mockRole = "admin";
			render(
				<MemoryRouter initialEntries={[route]}>
					<AppLayout />
				</MemoryRouter>
			);
			const link = screen.getByRole("link", { name: namePattern });
			expect(link.className).toContain("bg-white/20");
		});
	});

	describe("sidebar footer with user info", () => {
		it("should show username in sidebar footer when username is provided", () => {
			mockUsername = "john.doe";
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			expect(screen.getByText("john.doe")).toBeInTheDocument();
		});

		it("should show role in sidebar footer when role is provided", () => {
			mockUsername = "john.doe";
			mockRole = "admin";
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			expect(screen.getByText("admin")).toBeInTheDocument();
		});

		it("should not show user footer when username is null", () => {
			mockUsername = null;
			mockRole = null;
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			// No username means the footer block is absent
			// We check that neither a user-specific element nor role text appear
			expect(screen.queryByText("admin")).not.toBeInTheDocument();
		});

		it("should capitalize role display in sidebar footer", () => {
			mockUsername = "alice";
			mockRole = "operator";
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			const roleEl = screen.getByText("operator");
			expect(roleEl.className).toContain("capitalize");
		});

		it("role text should use text-primary-foreground/60 class (not text-gray-400)", () => {
			mockUsername = "alice";
			mockRole = "admin";
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			const roleEl = screen.getByText("admin");
			expect(roleEl.className).toContain("text-primary-foreground/60");
			expect(roleEl.className).not.toContain("text-gray-400");
		});
	});

	describe("sidebar CSS classes", () => {
		it("should use bg-primary for sidebar background (not bg-gray-900)", () => {
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			const sidebar = screen.getByRole("complementary");
			expect(sidebar.className).toContain("bg-primary");
			expect(sidebar.className).not.toContain("bg-gray-900");
		});

		it("should use bg-background for root layout (not bg-gray-100)", () => {
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);
			// The outer div wrapping everything uses bg-background
			const rootDiv = document.querySelector(".bg-background");
			expect(rootDiv).toBeInTheDocument();
		});
	});

	describe("mobile sidebar", () => {
		it("should close sidebar when close button inside sidebar is clicked", async () => {
			const user = userEvent.setup();
			render(
				<MemoryRouter initialEntries={["/dashboard"]}>
					<AppLayout />
				</MemoryRouter>
			);

			// Open sidebar first
			const openButton = screen.getByLabelText("Open menu");
			await user.click(openButton);

			const sidebar = screen.getByRole("complementary");
			expect(sidebar).toHaveClass("translate-x-0");

			// Close via the X button inside the sidebar
			const closeButtons = screen.getAllByLabelText("Close menu");
			// The button inside the sidebar (not the overlay)
			const sidebarCloseButton = closeButtons.find(
				(btn) => btn.tagName === "BUTTON" && !btn.className.includes("inset-0")
			);
			if (sidebarCloseButton) {
				await user.click(sidebarCloseButton);
				expect(sidebar).toHaveClass("-translate-x-full");
			}
		});
	});
});
