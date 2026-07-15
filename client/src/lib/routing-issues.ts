import type { PortConflict, PortMapping } from "./schemas.js";

export interface RoutingIssue {
	id: string;
	severity: "error" | "warning";
	title: string;
	detail: string;
}

export function buildRoutingIssues(
	appName: string,
	ports: PortMapping[],
	conflicts: PortConflict[]
): RoutingIssue[] {
	const issues: RoutingIssue[] = [];
	const normalizedApp = appName.toLowerCase();

	for (const conflict of conflicts) {
		if (!conflict.apps.map((a) => a.toLowerCase()).includes(normalizedApp)) {
			continue;
		}
		const others = conflict.apps.filter((a) => a.toLowerCase() !== normalizedApp);
		issues.push({
			id: `conflict-${conflict.scheme}-${conflict.hostPort}`,
			severity: "error",
			title: `Host port ${conflict.hostPort} (${conflict.scheme}) is shared with other apps`,
			detail: `These apps all map ${conflict.scheme} to host port ${conflict.hostPort}: ${conflict.apps.join(", ")}. Only one app can reliably own that port — this often causes wrong TLS certificates (SNI) and Let's Encrypt HTTP-01 failures (404 on acme-challenge). Give each public app its own host port, or map only one app to port 80 for HTTP.`,
		});
		if (others.length > 0 && conflict.scheme === "http" && conflict.hostPort === 80) {
			issues.push({
				id: "ssl-http80-conflict",
				severity: "error",
				title: "Let's Encrypt cannot complete while multiple apps use HTTP port 80",
				detail: `Remove or change the port 80 mapping on ${others.join(", ")} (or on ${appName}) so a single app serves HTTP on 80 for each hostname, then retry Enable Let's Encrypt.`,
			});
		}
	}

	const hasHttp80 = ports.some((p) => p.scheme === "http" && p.hostPort === 80);
	if (!hasHttp80 && ports.some((p) => p.scheme === "http")) {
		issues.push({
			id: "no-http-80",
			severity: "warning",
			title: "HTTP is not mapped to host port 80",
			detail:
				"Let's Encrypt HTTP-01 checks http://your-domain/.well-known/acme-challenge/ on port 80. Map http:80:<container-port> (Docklight uses container port 3001) unless another reverse proxy terminates HTTP correctly.",
		});
	}

	if (ports.length === 0) {
		issues.push({
			id: "no-ports",
			severity: "warning",
			title: "No proxy port mappings",
			detail:
				"Dokku may assign a random high port. Add http:80:<container-port> before enabling HTTPS on a custom domain.",
		});
	}

	return issues;
}