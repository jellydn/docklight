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
			if (e.key === "Escape" && !submitting) onClose();
		};
		if (visible) {
			window.addEventListener("keydown", handleEsc);
			return () => window.removeEventListener("keydown", handleEsc);
		}
	}, [visible, onClose, submitting]);

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
						disabled={submitting}
						className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
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
						disabled={submitting}
						className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed"
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

interface DeleteAppDialogProps {
	visible: boolean;
	appName: string;
	confirmName: string;
	onClose: () => void;
	onConfirm: () => void;
	onConfirmNameChange: (name: string) => void;
	submitting: boolean;
}

export function DeleteAppDialog({
	visible,
	appName,
	confirmName,
	onClose,
	onConfirm,
	onConfirmNameChange,
	submitting,
}: DeleteAppDialogProps) {
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !submitting) onClose();
		};
		if (visible) {
			window.addEventListener("keydown", handleEsc);
			return () => window.removeEventListener("keydown", handleEsc);
		}
	}, [visible, onClose, submitting]);

	if (!visible) return null;

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
			role="dialog"
			aria-modal="true"
		>
			<div className="bg-white rounded p-6 max-w-md w-full">
				<div className="flex justify-between items-start mb-4">
					<h2 className="text-lg font-semibold text-red-600">Delete App</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
						type="button"
						aria-label="Close dialog"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<p className="mb-4">
					This action is <strong>irreversible</strong>. The app <strong>{appName}</strong> and all
					its data will be permanently deleted.
				</p>
				<div className="mb-4">
					<label
						htmlFor="confirmDeleteName"
						className="block text-sm font-medium text-gray-700 mb-2"
					>
						Type <strong>{appName}</strong> to confirm
					</label>
					<input
						id="confirmDeleteName"
						type="text"
						value={confirmName}
						onChange={(e) => onConfirmNameChange(e.target.value)}
						placeholder="Enter app name"
						className="w-full border rounded px-3 py-2"
					/>
				</div>
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
						disabled={confirmName !== appName || submitting}
						className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
						type="button"
					>
						{submitting ? "Deleting..." : "Delete App"}
					</button>
				</div>
			</div>
		</div>
	);
}

interface ScaleDialogProps {
	visible: boolean;
	appName: string;
	scaleChanges: Array<{ processType: string; count: number }>;
	onClose: () => void;
	onConfirm: () => void;
	submitting: boolean;
}

export function ScaleDialog({
	visible,
	appName,
	scaleChanges,
	onClose,
	onConfirm,
	submitting,
}: ScaleDialogProps) {
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !submitting) onClose();
		};
		if (visible) {
			window.addEventListener("keydown", handleEsc);
			return () => window.removeEventListener("keydown", handleEsc);
		}
	}, [visible, onClose, submitting]);

	if (!visible) return null;

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
			role="dialog"
			aria-modal="true"
		>
			<div className="bg-white rounded p-6 max-w-md w-full">
				<div className="flex justify-between items-start mb-4">
					<h2 className="text-lg font-semibold">Confirm Scale</h2>
					<button
						onClick={onClose}
						disabled={submitting}
						className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
						type="button"
						aria-label="Close dialog"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<p className="mb-3">
					Apply these scaling changes for <strong>{appName}</strong>?
				</p>
				<ul className="mb-6 list-disc list-inside">
					{scaleChanges.map((change) => (
						<li key={change.processType}>
							<strong>{change.processType}</strong>: {change.count}
						</li>
					))}
				</ul>
				<div className="flex justify-end space-x-2">
					<button
						onClick={onClose}
						disabled={submitting}
						className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed"
						type="button"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={submitting}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
						type="button"
					>
						{submitting ? "Applying..." : "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}
