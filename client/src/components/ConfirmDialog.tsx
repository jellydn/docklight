1|import type { ReactNode } from "react";
2|import { useId } from "react";
3|import { useNativeDialog } from "@/hooks/use-native-dialog.js";
4|import { X } from "lucide-react";
5|
6|interface ConfirmDialogProps {
7|	visible: boolean;
8|	title: string;
9|	onClose: () => void;
10|	onConfirm: () => void;
11|	confirmDisabled?: boolean;
12|	submitting?: boolean;
13|	submittingText?: string;
14|	confirmText?: string;
15|	isDestructive?: boolean;
16|	children: ReactNode;
17|}
18|
19|export function ConfirmDialog({
20|	visible,
21|	title,
22|	onClose,
23|	onConfirm,
24|	confirmDisabled = false,
25|	submitting = false,
26|	submittingText = "Processing...",
27|	confirmText = "Confirm",
28|	isDestructive = false,
29|	children,
30|}: ConfirmDialogProps) {
31|	const dialogRef = useNativeDialog({ open: visible, onClose });
32|	const titleId = useId();
33|
34|	const buttonClass = isDestructive
35|		? "bg-red-600 text-white rounded hover:bg-red-700"
36|		: "bg-blue-600 text-white rounded hover:bg-blue-700";
37|
38|	return (
39|		<dialog
40|			ref={dialogRef}
41|			className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded border bg-card p-0 border border-border backdrop:bg-black/50"
42|			aria-labelledby={titleId}
43|		>
44|			<div className="p-6">
45|				<div className="flex justify-between items-start mb-4">
46|					<h2
47|						id={titleId}
48|						className={`text-lg font-semibold ${isDestructive ? "text-red-600" : ""}`}
49|					>
50|						{title}
51|					</h2>
52|					<button
53|						onClick={onClose}
54|						className="text-muted-foreground hover:text-foreground"
55|						type="button"
56|						aria-label="Close dialog"
57|					>
58|						<X className="w-5 h-5" />
59|					</button>
60|				</div>
61|				<div className="mb-6">{children}</div>
62|				<div className="flex justify-end space-x-2">
63|					<button
64|						onClick={onClose}
65|						className="px-4 py-2 border rounded hover:bg-accent"
66|						type="button"
67|					>
68|						Cancel
69|					</button>
70|					<button
71|						onClick={onConfirm}
72|						disabled={confirmDisabled || submitting}
73|						className={`px-4 py-2 ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
74|						type="button"
75|					>
76|						{submitting ? submittingText : confirmText}
77|					</button>
78|				</div>
79|			</div>
80|		</dialog>
81|	);
82|}
83|