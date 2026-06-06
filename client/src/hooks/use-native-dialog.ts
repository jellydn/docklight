import { useEffect, useRef, useEffectEvent } from "react";

interface UseNativeDialogOptions {
	open: boolean;
	onClose: () => void;
}

export function useNativeDialog({ open, onClose }: UseNativeDialogOptions) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const onCloseEvent = useEffectEvent(onClose);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (open) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	}, [open]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleCancel = () => onCloseEvent();
		dialog.addEventListener("cancel", handleCancel);
		return () => dialog.removeEventListener("cancel", handleCancel);
	}, []);

	return dialogRef;
}
