import { useEffect, useEffectEvent, useRef } from "react";
import { X } from "lucide-react";

export { ConfirmDialog } from "@/components/ConfirmDialog.js";

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
	const dialogRef = useRef<HTMLDialogElement>(null);
	const onCloseEvent = useEffectEvent(onClose);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (visible) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	}, [visible]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleCancel = () => onCloseEvent();
		dialog.addEventListener("cancel", handleCancel);
		return () => dialog.removeEventListener("cancel", handleCancel);
	}, []);

	return (
		<dialog
			ref={dialogRef}
			className="rounded p-0 max-w-md w-full bg-white backdrop:bg-black/50"
			aria-labelledby="delete-dialog-title"
		>
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<h2 id="delete-dialog-title" className="text-lg font-semibold text-red-600">
						Delete App
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
		</dialog>
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
	const dialogRef = useRef<HTMLDialogElement>(null);
	const onCloseEvent = useEffectEvent(onClose);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (visible) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	}, [visible]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleCancel = () => onCloseEvent();
		dialog.addEventListener("cancel", handleCancel);
		return () => dialog.removeEventListener("cancel", handleCancel);
	}, []);

	return (
		<dialog
			ref={dialogRef}
			className="rounded p-0 max-w-md w-full bg-white backdrop:bg-black/50"
			aria-labelledby="scale-dialog-title"
		>
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<h2 id="scale-dialog-title" className="text-lg font-semibold">
						Confirm Scale
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
						className="px-4 py-2 border rounded hover:bg-gray-100"
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
		</dialog>
	);
}
