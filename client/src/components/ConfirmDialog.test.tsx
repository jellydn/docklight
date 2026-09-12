import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog.js";

describe("ConfirmDialog", () => {
	const defaultProps = {
		visible: true,
		title: "Confirm Action",
		onClose: vi.fn(),
		onConfirm: vi.fn(),
		children: <p>Are you sure?</p>,
	};

	describe("rendering", () => {
		it("should render the dialog title", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		});

		it("should render children content", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(screen.getByText("Are you sure?")).toBeInTheDocument();
		});

		it("should render Cancel button", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
		});

		it("should render Confirm button with default text", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
		});

		it("should render Confirm button with custom confirmText", () => {
			render(<ConfirmDialog {...defaultProps} confirmText="Delete" />);
			expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
		});

		it("should render Close X button with aria-label", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
		});

		it("should show dialog as open when visible is true", () => {
			render(<ConfirmDialog {...defaultProps} visible={true} />);
			const dialog = document.querySelector("dialog");
			expect(dialog).toHaveAttribute("open");
		});

		it("should not show dialog as open when visible is false", () => {
			render(<ConfirmDialog {...defaultProps} visible={false} />);
			const dialog = document.querySelector("dialog");
			expect(dialog).not.toHaveAttribute("open");
		});

		it("should render custom children as ReactNode", () => {
			render(
				<ConfirmDialog {...defaultProps}>
					<span data-testid="custom-child">Custom content</span>
				</ConfirmDialog>
			);
			expect(screen.getByTestId("custom-child")).toBeInTheDocument();
		});
	});

	describe("submitting state", () => {
		it("should show submittingText when submitting is true", () => {
			render(<ConfirmDialog {...defaultProps} submitting={true} submittingText="Deleting..." />);
			expect(screen.getByRole("button", { name: "Deleting..." })).toBeInTheDocument();
		});

		it("should show default submittingText when submitting and no custom text provided", () => {
			render(<ConfirmDialog {...defaultProps} submitting={true} />);
			expect(screen.getByRole("button", { name: "Processing..." })).toBeInTheDocument();
		});

		it("should disable confirm button when submitting", () => {
			render(<ConfirmDialog {...defaultProps} submitting={true} />);
			const confirmButton = screen.getByRole("button", { name: "Processing..." });
			expect(confirmButton).toBeDisabled();
		});

		it("should show confirmText when not submitting", () => {
			render(<ConfirmDialog {...defaultProps} submitting={false} confirmText="OK" />);
			expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
		});
	});

	describe("disabled state", () => {
		it("should disable confirm button when confirmDisabled is true", () => {
			render(<ConfirmDialog {...defaultProps} confirmDisabled={true} />);
			expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
		});

		it("should enable confirm button when confirmDisabled is false", () => {
			render(<ConfirmDialog {...defaultProps} confirmDisabled={false} />);
			expect(screen.getByRole("button", { name: "Confirm" })).not.toBeDisabled();
		});

		it("disabled confirm button should have opacity-50 class (not bg-gray-300)", () => {
			render(<ConfirmDialog {...defaultProps} confirmDisabled={true} />);
			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			expect(confirmButton.className).toContain("disabled:opacity-50");
			expect(confirmButton.className).not.toContain("disabled:bg-gray-300");
		});
	});

	describe("destructive mode", () => {
		it("should apply destructive color to title when isDestructive is true", () => {
			render(<ConfirmDialog {...defaultProps} isDestructive={true} title="Delete App" />);
			const title = screen.getByText("Delete App");
			expect(title.className).toContain("text-destructive");
		});

		it("should not apply destructive color to title when isDestructive is false", () => {
			render(<ConfirmDialog {...defaultProps} isDestructive={false} title="Confirm Action" />);
			const title = screen.getByText("Confirm Action");
			expect(title.className).not.toContain("text-destructive");
		});

		it("should use destructive button styling when isDestructive is true", () => {
			render(<ConfirmDialog {...defaultProps} isDestructive={true} />);
			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			expect(confirmButton.className).toContain("bg-destructive");
		});

		it("should use tertiary button styling when isDestructive is false", () => {
			render(<ConfirmDialog {...defaultProps} isDestructive={false} />);
			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			expect(confirmButton.className).toContain("bg-tertiary");
		});
	});

	describe("user interactions", () => {
		it("should call onClose when Cancel button is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();
			render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
			await user.click(screen.getByRole("button", { name: "Cancel" }));
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("should call onClose when Close dialog button is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();
			render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
			await user.click(screen.getByRole("button", { name: "Close dialog" }));
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("should call onConfirm when Confirm button is clicked", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
			await user.click(screen.getByRole("button", { name: "Confirm" }));
			expect(onConfirm).toHaveBeenCalledTimes(1);
		});

		it("should not call onConfirm when confirm button is disabled", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} confirmDisabled={true} />);
			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			await user.click(confirmButton);
			expect(onConfirm).not.toHaveBeenCalled();
		});

		it("should not call onConfirm when submitting", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} submitting={true} />);
			const confirmButton = screen.getByRole("button", { name: "Processing..." });
			await user.click(confirmButton);
			expect(onConfirm).not.toHaveBeenCalled();
		});
	});

	describe("theme token CSS classes", () => {
		it("should use bg-card for dialog background (not bg-white)", () => {
			render(<ConfirmDialog {...defaultProps} />);
			const dialog = document.querySelector("dialog");
			expect(dialog?.className).toContain("bg-card");
			expect(dialog?.className).not.toContain("bg-white");
		});

		it("should use text-muted-foreground for close button (not text-gray-500)", () => {
			render(<ConfirmDialog {...defaultProps} />);
			const closeButton = screen.getByRole("button", { name: "Close dialog" });
			expect(closeButton.className).toContain("text-muted-foreground");
			expect(closeButton.className).not.toContain("text-gray-500");
		});

		it("Cancel button should use hover:bg-accent (not hover:bg-gray-100)", () => {
			render(<ConfirmDialog {...defaultProps} />);
			const cancelButton = screen.getByRole("button", { name: "Cancel" });
			expect(cancelButton.className).toContain("hover:bg-accent");
			expect(cancelButton.className).not.toContain("hover:bg-gray-100");
		});
	});
});
