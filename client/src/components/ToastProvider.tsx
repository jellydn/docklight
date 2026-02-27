import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Toast, CommandResult } from "./types.js";

interface ToastContextType {
	toasts: Toast[];
	addToast: (type: "success" | "error", message: string, result?: CommandResult) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = useCallback(
		(type: "success" | "error", message: string, result?: CommandResult) => {
			const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			setToasts((prev) => [...prev, { id, type, message, result }]);
		},
		[]
	);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}
