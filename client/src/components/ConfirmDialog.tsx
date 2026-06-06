import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ConfirmDialogProps {
	visible: boolean;
	title: string;
	onClose: () => void;
	onConfirm: () => void;
	confirmDisabled?: boolean;
	submitting?: boolean;
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
	confirmText = "Confirm",
	isDestructive = false,
	children,
}: ConfirmDialogProps) {
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (visible) {
			window.addEventListener("keydown", handleEsc);
			return () => window.removeEventListener("keydown", handleEsc);
		}
	}, [visible, onClose]);

	if (!visible) return null;

	const buttonClass = isDestructive
		? "bg-red-600 text-white rounded hover:bg-red-700"
		: "bg-blue-600 text-white rounded hover:bg-blue-700";

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
		>
			<div className="bg-white rounded p-6 max-w-md w-full">
				<div className="flex justify-between items-start mb-4">
					<h2
						id="dialog-title"
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
						{submitting ? "Processing..." : confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}
