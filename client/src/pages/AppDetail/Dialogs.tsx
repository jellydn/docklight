import { ConfirmDialog } from "@/components/ConfirmDialog.js";

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
	return (
		<ConfirmDialog
			visible={visible}
			title="Delete App"
			onClose={onClose}
			onConfirm={onConfirm}
			confirmDisabled={confirmName !== appName}
			submitting={submitting}
			submittingText="Deleting..."
			confirmText="Delete App"
			isDestructive
		>
			<p className="mb-4">
				This action is <strong>irreversible</strong>. The app <strong>{appName}</strong> and all its
				data will be permanently deleted.
			</p>
			<div className="mb-4">
				<label htmlFor="confirmDeleteName" className="block text-sm font-medium text-foreground mb-2">
					Type <strong>{appName}</strong> to confirm
				</label>
				<input
					id="confirmDeleteName"
					type="text"
					value={confirmName}
					onChange={(e) => onConfirmNameChange(e.target.value)}
					placeholder="Enter app name"
					className="w-full border rounded px-3 py-2"
					aria-label="Confirm app name"
				/>
			</div>
		</ConfirmDialog>
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
	return (
		<ConfirmDialog
			visible={visible}
			title="Confirm Scale"
			onClose={onClose}
			onConfirm={onConfirm}
			submitting={submitting}
			submittingText="Applying..."
			confirmText="Confirm"
		>
			<p className="mb-3">
				Apply these scaling changes for <strong>{appName}</strong>?
			</p>
			<ul className="list-disc list-inside">
				{scaleChanges.map((change) => (
					<li key={change.processType}>
						<strong>{change.processType}</strong>: {change.count}
					</li>
				))}
			</ul>
		</ConfirmDialog>
	);
}
