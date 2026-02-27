import { createContext, type ReactNode, useCallback, useContext } from "react";
import { toast } from "sonner";
import type { CommandResult } from "./types.js";

interface ToastContextType {
	addToast: (type: "success" | "error", message: string, result?: CommandResult) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
	const addToast = useCallback(
		(type: "success" | "error", message: string, result?: CommandResult) => {
			const options = {
				description: result ? `Exit code: ${result.exitCode}` : undefined,
				duration: 5000,
			};
			if (type === "success") {
				toast.success(message, options);
			} else {
				toast.error(message, options);
			}
		},
		[]
	);

	const removeToast = useCallback((id: string) => {
		toast.dismiss(id);
	}, []);

	return (
		<ToastContext.Provider value={{ addToast, removeToast }}>{children}</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}
