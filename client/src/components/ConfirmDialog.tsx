import type { ReactNode } from "react";
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
	id?: string;
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
	id = "dialog-title",
	children,
}: ConfirmDialogProps) {
	const dialogRef = useNativeDialog({ open: visible, onClose });

	const buttonClass = isDestructive
		? "bg-red-600 text-white rounded hover:bg-red-700"
		: "bg-blue-600 text-white rounded hover:bg-blue-700";

	const labelledby = `${id}-heading`;

	return (
		<dialog
			ref={dialogRef}
			className="rounded p-0 max-w-md w-full bg-white backdrop:bg-black/50"
			aria-labelledby={labelledby}
		>
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<h2
						id={labelledby}
						className={`text-lg font-semibold ${isDestructive ? "text-red-600" : ""}`}
					>
						{title}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
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
						className="px-4 py-2 border rounded hover:bg-gray-100"
						type="button"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={confirmDisabled || submitting}
						className={`px-4 py-2 ${buttonClass} disabled:bg-gray-300 disabled:cursor-not-allowed`}
						type="button"
					>
						{submitting ? submittingText : confirmText}
					</button>
				</div>
			</div>
		</dialog>
	);
}
