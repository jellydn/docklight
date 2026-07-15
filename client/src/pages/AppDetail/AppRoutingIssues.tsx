import type { RoutingIssue } from "@/lib/routing-issues.js";
import { alertBannerClass } from "@/lib/status-styles.js";

interface AppRoutingIssuesProps {
	issues: RoutingIssue[];
	loading?: boolean;
}

export function AppRoutingIssues({ issues, loading }: AppRoutingIssuesProps) {
	if (loading) {
		return null;
	}
	if (issues.length === 0) {
		return null;
	}

	return (
		<div className="space-y-3 mb-6">
			{issues.map((issue) => (
				<div
					key={issue.id}
					className={alertBannerClass(issue.severity === "error" ? "error" : "warning")}
					role="alert"
				>
					<p className="font-medium">{issue.title}</p>
					<p className="text-sm mt-1 opacity-90">{issue.detail}</p>
				</div>
			))}
		</div>
	);
}