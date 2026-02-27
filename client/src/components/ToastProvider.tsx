import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import { toast } from "sonner";
import { CommandResultComponent } from "./CommandResult.js";
import type { CommandResult } from "./types.js";

interface ToastContextType {
	addToast: (type: "success" | "error", message: string, result?: CommandResult) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
	const addToast = useCallback(
		(type: "success" | "error", message: string, result?: CommandResult) => {
			if (!result) {
				if (type === "success") {
					toast.success(message, { duration: 5000 });
				} else {
					toast.error(message, { duration: 5000 });
				}
				return;
			}

			toast.custom(
				(id) => <ToastWithResult id={id} type={type} message={message} result={result} />,
				{ duration: 5000 }
			);
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

function ToastWithResult({
	id,
	type,
	message,
	result,
}: {
	id: string | number;
	type: "success" | "error";
	message: string;
	result: CommandResult;
}) {
	const [expanded, setExpanded] = useState(false);
	const bgColor =
		type === "success" ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400";
	const textColor = type === "success" ? "text-green-800" : "text-red-800";

	return (
		<div className={`${bgColor} border rounded-lg shadow-lg overflow-hidden`}>
			<div className="p-4">
				<div className="flex items-center justify-between">
					<span className={`${textColor} font-medium`}>{message}</span>
					<button
						onClick={() => toast.dismiss(id)}
						className="ml-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						×
					</button>
				</div>
				<button
					onClick={() => setExpanded(!expanded)}
					className="mt-2 text-sm text-blue-600 hover:underline"
				>
					{expanded ? "Hide details" : "Show details"}
				</button>
			</div>
			{expanded && (
				<div className="border-t border-gray-200 p-4">
					<CommandResultComponent result={result} />
				</div>
			)}
		</div>
	);
}
