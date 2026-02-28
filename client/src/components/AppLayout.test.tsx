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

describe("AppLayout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render the layout with navigation links", () => {
		render(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<AppLayout />
			</MemoryRouter>,
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
			</MemoryRouter>,
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
			</MemoryRouter>,
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
			</MemoryRouter>,
		);

		// Outlet renders child content, in this case empty for the test
		// But we can verify the main element exists
		const main = screen.getByRole("main") ?? document.querySelector("main");
		expect(main).toBeInTheDocument();
	});
});
