import { useToast } from "./ToastProvider.js";
import { CommandResultComponent } from "./CommandResult.js";
import { useState } from "react";

export function ToastContainer() {
	const { toasts, removeToast } = useToast();

	return (
		<div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
			))}
		</div>
	);
}

function Toast({
	toast,
	onClose,
}: {
	toast: {
		id: string;
		type: "success" | "error";
		message: string;
		result?: import("./types.js").CommandResult;
	};
	onClose: () => void;
}) {
	const [expanded, setExpanded] = useState(false);

	const bgColor =
		toast.type === "success" ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400";
	const textColor = toast.type === "success" ? "text-green-800" : "text-red-800";

	return (
		<div className={`${bgColor} border rounded-lg shadow-lg overflow-hidden`}>
			<div className="p-4">
				<div className="flex items-center justify-between">
					<span className={`${textColor} font-medium`}>{toast.message}</span>
					<button
						onClick={onClose}
						className="ml-4 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						×
					</button>
				</div>
				{toast.result && (
					<button
						onClick={() => setExpanded(!expanded)}
						className="mt-2 text-sm text-blue-600 hover:underline"
					>
						{expanded ? "Hide details" : "Show details"}
					</button>
				)}
			</div>
			{expanded && toast.result && (
				<div className="border-t border-gray-200 p-4">
					<CommandResultComponent result={toast.result} />
				</div>
			)}
		</div>
	);
}
