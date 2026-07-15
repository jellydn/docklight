import { listAppNames } from "./apps.js";
import { getPorts, type PortMapping } from "./ports.js";

export interface PortConflict {
	scheme: string;
	hostPort: number;
	apps: string[];
}

export interface PortConflictsResult {
	conflicts: PortConflict[];
}

function conflictKey(scheme: string, hostPort: number): string {
	return `${scheme.toLowerCase()}:${hostPort}`;
}

export function detectPortConflictsFromMappings(
	appPorts: Record<string, PortMapping[]>
): PortConflict[] {
	const byKey = new Map<string, Set<string>>();

	for (const [appName, ports] of Object.entries(appPorts)) {
		for (const port of ports) {
			const key = conflictKey(port.scheme, port.hostPort);
			const apps = byKey.get(key) ?? new Set<string>();
			apps.add(appName);
			byKey.set(key, apps);
		}
	}

	const conflicts: PortConflict[] = [];
	for (const [key, apps] of byKey) {
		if (apps.size < 2) {
			continue;
		}
		const [scheme, hostPortStr] = key.split(":");
		conflicts.push({
			scheme,
			hostPort: Number.parseInt(hostPortStr, 10),
			apps: [...apps].sort(),
		});
	}

	conflicts.sort((a, b) => a.hostPort - b.hostPort || a.scheme.localeCompare(b.scheme));
	return conflicts;
}

export async function getPortConflicts(userId?: string): Promise<
	| PortConflictsResult
	| { error: string; command: string; exitCode: number; stderr: string }
> {
	const listResult = await listAppNames(userId);
	if (!listResult.ok) {
		return {
			error: listResult.error.stderr || "Failed to list apps",
			command: listResult.error.command,
			exitCode: listResult.error.exitCode,
			stderr: listResult.error.stderr,
		};
	}

	const portResults = await Promise.all(
		listResult.names.map(async (appName) => {
			const ports = await getPorts(appName);
			return { appName, ports };
		})
	);
	const appPorts: Record<string, PortMapping[]> = {};
	for (const { appName, ports } of portResults) {
		if (Array.isArray(ports)) {
			appPorts[appName] = ports;
		}
	}

	return { conflicts: detectPortConflictsFromMappings(appPorts) };
}

export function conflictsForApp(
	conflicts: PortConflict[],
	appName: string
): PortConflict[] {
	return conflicts.filter((c) => c.apps.includes(appName));
}

export function appHasHttpOnPort80(ports: PortMapping[]): boolean {
	return ports.some((p) => p.scheme.toLowerCase() === "http" && p.hostPort === 80);
}