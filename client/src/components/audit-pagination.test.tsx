import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditPagination } from "./audit-pagination.js";
import { ITEMS_PER_PAGE } from "../lib/constants.js";

describe("AuditPagination", () => {
	describe("rendering", () => {
		it("should return null when total is 0", () => {
			const { container } = render(
				<AuditPagination total={0} offset={0} setOffset={vi.fn()} />
			);
			expect(container.firstChild).toBeNull();
		});

		it("should return null when total equals ITEMS_PER_PAGE", () => {
			const { container } = render(
				<AuditPagination total={ITEMS_PER_PAGE} offset={0} setOffset={vi.fn()} />
			);
			expect(container.firstChild).toBeNull();
		});

		it("should return null when total is less than ITEMS_PER_PAGE", () => {
			const { container } = render(
				<AuditPagination total={ITEMS_PER_PAGE - 1} offset={0} setOffset={vi.fn()} />
			);
			expect(container.firstChild).toBeNull();
		});

		it("should render pagination when total exceeds ITEMS_PER_PAGE", () => {
			render(
				<AuditPagination total={ITEMS_PER_PAGE + 1} offset={0} setOffset={vi.fn()} />
			);
			expect(screen.getAllByRole("button", { name: "Previous" })).toHaveLength(2);
			expect(screen.getAllByRole("button", { name: "Next" })).toHaveLength(2);
		});

		it("should show Page 1 of 2 when total is 51 and offset is 0", () => {
			render(
				<AuditPagination total={51} offset={0} setOffset={vi.fn()} />
			);
			expect(screen.getByText(`Page 1 of 2`)).toBeInTheDocument();
		});

		it("should show Page 2 of 2 when on the second page", () => {
			render(
				<AuditPagination total={51} offset={ITEMS_PER_PAGE} setOffset={vi.fn()} />
			);
			expect(screen.getByText(`Page 2 of 2`)).toBeInTheDocument();
		});

		it("should show correct page info with multiple pages", () => {
			render(
				<AuditPagination total={150} offset={ITEMS_PER_PAGE} setOffset={vi.fn()} />
			);
			expect(screen.getByText(`Page 2 of 3`)).toBeInTheDocument();
		});

		it("should display result range for first page", () => {
			render(
				<AuditPagination total={100} offset={0} setOffset={vi.fn()} />
			);
			// The range text is split across spans so we check parts
			expect(screen.getByText("1")).toBeInTheDocument();
			expect(screen.getByText("100")).toBeInTheDocument();
		});

		it("should display result range for second page", () => {
			render(
				<AuditPagination total={75} offset={ITEMS_PER_PAGE} setOffset={vi.fn()} />
			);
			// offset 50, showing 51 to 75 of 75 — "75" appears in both upper range and total
			expect(screen.getAllByText("75")).toHaveLength(2);
		});
	});

	describe("Previous button", () => {
		it("should be disabled when offset is 0", () => {
			render(
				<AuditPagination total={100} offset={0} setOffset={vi.fn()} />
			);
			const prevButtons = screen.getAllByRole("button", { name: "Previous" });
			for (const btn of prevButtons) {
				expect(btn).toBeDisabled();
			}
		});

		it("should be enabled when offset is greater than 0", () => {
			render(
				<AuditPagination total={100} offset={ITEMS_PER_PAGE} setOffset={vi.fn()} />
			);
			const prevButtons = screen.getAllByRole("button", { name: "Previous" });
			for (const btn of prevButtons) {
				expect(btn).not.toBeDisabled();
			}
		});

		it("should call setOffset with decreased value when clicked", async () => {
			const user = userEvent.setup();
			const setOffset = vi.fn();
			render(
				<AuditPagination total={150} offset={ITEMS_PER_PAGE} setOffset={setOffset} />
			);
			const prevButtons = screen.getAllByRole("button", { name: "Previous" });
			await user.click(prevButtons[0]);
			expect(setOffset).toHaveBeenCalledWith(0);
		});

		it("should never call setOffset with negative value", async () => {
			const user = userEvent.setup();
			const setOffset = vi.fn();
			// Edge case: offset=10 (less than ITEMS_PER_PAGE but > 0)
			render(
				<AuditPagination total={100} offset={10} setOffset={setOffset} />
			);
			const prevButtons = screen.getAllByRole("button", { name: "Previous" });
			await user.click(prevButtons[0]);
			// Math.max(0, 10 - ITEMS_PER_PAGE) = Math.max(0, -40) = 0
			expect(setOffset).toHaveBeenCalledWith(0);
		});
	});

	describe("Next button", () => {
		it("should be disabled when on the last page", () => {
			render(
				<AuditPagination total={100} offset={ITEMS_PER_PAGE} setOffset={vi.fn()} />
			);
			const nextButtons = screen.getAllByRole("button", { name: "Next" });
			for (const btn of nextButtons) {
				expect(btn).toBeDisabled();
			}
		});

		it("should be disabled when offset + ITEMS_PER_PAGE equals total", () => {
			render(
				<AuditPagination total={100} offset={50} setOffset={vi.fn()} />
			);
			const nextButtons = screen.getAllByRole("button", { name: "Next" });
			for (const btn of nextButtons) {
				expect(btn).toBeDisabled();
			}
		});

		it("should be enabled when not on the last page", () => {
			render(
				<AuditPagination total={100} offset={0} setOffset={vi.fn()} />
			);
			const nextButtons = screen.getAllByRole("button", { name: "Next" });
			for (const btn of nextButtons) {
				expect(btn).not.toBeDisabled();
			}
		});

		it("should call setOffset with increased value when clicked", async () => {
			const user = userEvent.setup();
			const setOffset = vi.fn();
			render(
				<AuditPagination total={150} offset={0} setOffset={setOffset} />
			);
			const nextButtons = screen.getAllByRole("button", { name: "Next" });
			await user.click(nextButtons[0]);
			expect(setOffset).toHaveBeenCalledWith(ITEMS_PER_PAGE);
		});

		it("should advance to the correct page offset when on page 2", async () => {
			const user = userEvent.setup();
			const setOffset = vi.fn();
			render(
				<AuditPagination total={200} offset={ITEMS_PER_PAGE} setOffset={setOffset} />
			);
			const nextButtons = screen.getAllByRole("button", { name: "Next" });
			await user.click(nextButtons[0]);
			expect(setOffset).toHaveBeenCalledWith(ITEMS_PER_PAGE * 2);
		});
	});

	describe("theme token CSS classes", () => {
		it("should use bg-muted/50 for pagination container (not bg-gray-50)", () => {
			const { container } = render(
				<AuditPagination total={100} offset={0} setOffset={vi.fn()} />
			);
			const wrapper = container.firstChild as HTMLElement;
			// bg-muted/50 is applied via class attribute (Tailwind)
			expect(wrapper?.className).toContain("bg-muted/50");
			expect(wrapper?.className).not.toContain("bg-gray-50");
		});

		it("should use border-border for top border (not border-gray-200)", () => {
			const { container } = render(
				<AuditPagination total={100} offset={0} setOffset={vi.fn()} />
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper?.className).toContain("border-border");
			expect(wrapper?.className).not.toContain("border-gray-200");
		});

		it("Previous buttons should use bg-card class (not bg-white)", () => {
			render(
				<AuditPagination total={100} offset={ITEMS_PER_PAGE} setOffset={vi.fn()} />
			);
			const prevButtons = screen.getAllByRole("button", { name: "Previous" });
			for (const btn of prevButtons) {
				expect(btn.className).toContain("bg-card");
				expect(btn.className).not.toContain("bg-white");
			}
		});

		it("disabled Previous button should use opacity-50 (not bg-gray-100)", () => {
			render(
				<AuditPagination total={100} offset={0} setOffset={vi.fn()} />
			);
			const prevButtons = screen.getAllByRole("button", { name: "Previous" });
			for (const btn of prevButtons) {
				expect(btn.className).toContain("disabled:opacity-50");
				expect(btn.className).not.toContain("disabled:bg-gray-100");
			}
		});
	});
});
