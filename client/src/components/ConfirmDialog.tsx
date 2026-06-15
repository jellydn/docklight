import type { ReactNode } from "react";
import { useId } from "react";
import { useNativeDialog } from "@/hooks/use-native-dialog.js";
import { X } from "lucide-react";

interface ConfirmDialogProps {
	visible: boolean;
	title: string;
	onClose: () => void;
	onConfirm: () => void;
	confirmDisabled?: boolean;
	submitting?: boolean;
	submittingText?: string;
	confirmText?: string;
	isDestructive?: boolean;
	children: ReactNode;
}

export function ConfirmDialog({
	visible,
	title,
	onClose,
	onConfirm,
	confirmDisabled = false,
	submitting = false,
	submittingText = "Processing...",
	confirmText = "Confirm",
	isDestructive = false,
	children,
}: ConfirmDialogProps) {
	const dialogRef = useNativeDialog({ open: visible, onClose });
	const titleId = useId();

	const buttonClass = isDestructive
		? "bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
		: "bg-tertiary text-tertiary-foreground rounded hover:bg-tertiary/90";

	return (
		<dialog
			ref={dialogRef}
			className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded border bg-card p-0 border border-border backdrop:bg-foreground/50"
			aria-labelledby={titleId}
		>
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<h2
						id={titleId}
						className={`text-lg font-semibold ${isDestructive ? "text-destructive" : ""}`}
					>
						{title}
					</h2>
					<button
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground"
						type="button"
						aria-label="Close dialog"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="mb-6">{children}</div>
				<div className="flex justify-end space-x-2">
					<button
						onClick={onClose}
						className="px-4 py-2 border rounded hover:bg-accent"
						type="button"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={confirmDisabled || submitting}
						className={`px-4 py-2 ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
						type="button"
					>
						{submitting ? submittingText : confirmText}
					</button>
				</div>
			</div>
		</dialog>
	);
}
