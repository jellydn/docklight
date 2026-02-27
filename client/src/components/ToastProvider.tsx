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
	const statusDotColor = type === "success" ? "bg-emerald-500" : "bg-rose-500";
	const statusTextColor = type === "success" ? "text-emerald-700" : "text-rose-700";
	const stdoutPreview = result.stdout.trim().slice(0, 220);
	const stderrPreview = result.stderr.trim().slice(0, 220);

	return (
		<div className="group w-[360px] overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 shadow-lg">
			<div className="p-3">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
							<p className="truncate text-sm font-semibold">{message}</p>
						</div>
						<p className={`mt-1 text-xs ${statusTextColor}`}>
							Exit code: {result.exitCode} • Hover for details
						</p>
					</div>
					<button
						onClick={() => toast.dismiss(id)}
						className="text-sm text-gray-400 hover:text-gray-700"
						aria-label="Close"
					>
						×
					</button>
				</div>
			</div>
			<div className="max-h-0 overflow-y-auto border-t border-transparent px-3 opacity-0 transition-all duration-200 group-hover:max-h-64 group-hover:border-gray-200 group-hover:py-3 group-hover:opacity-100">
				<div className="text-xs text-gray-700">
					<div>
						<span className="font-semibold">Command:</span> {result.command}
					</div>
					{stdoutPreview && (
						<div className="mt-2">
							<div className="font-semibold">Output</div>
							<pre className="mt-1 overflow-x-auto rounded bg-gray-100 p-2 text-[11px] leading-4">
								{stdoutPreview}
							</pre>
						</div>
					)}
					{stderrPreview && (
						<div className="mt-2">
							<div className="font-semibold text-rose-700">Error</div>
							<pre className="mt-1 overflow-x-auto rounded bg-rose-50 p-2 text-[11px] leading-4 text-rose-800">
								{stderrPreview}
							</pre>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
