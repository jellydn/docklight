import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog.js";
import { healthBannerClass, healthBarClass } from "@/lib/status-styles.js";
import { isDiskUnderPressure, type ServerHealth } from "../lib/schemas.js";

export type MaintenanceActionId = "cleanup" | "purge";

type HealthStatus = ServerHealth["status"];
type MetricKey = keyof ServerHealth["resources"];

const METRICS: ReadonlyArray<{ key: MetricKey; label: string }> = [
	{ key: "cpu", label: "CPU" },
	{ key: "memory", label: "Memory" },
	{ key: "disk", label: "Disk" },
];

const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
	ok: "OK",
	warning: "Watch closely",
	critical: "Critical",
};

const MAINTENANCE_ACTIONS: ReadonlyArray<{
	id: MaintenanceActionId;
	label: string;
	title: string;
	description: React.ReactNode;
	visible: (health: ServerHealth) => boolean;
}> = [
	{
		id: "cleanup",
		label: "Clean unused",
		title: "Clean unused Dokku resources",
		description: (
			<p className="text-sm text-muted-foreground">
				This runs <code className="font-mono">dokku cleanup</code> to remove unused containers and
				images. Volumes are not removed.
			</p>
		),
		visible: () => true,
	},
	{
		id: "purge",
		label: "Purge build caches",
		title: "Purge build caches",
		description: (
			<p className="text-sm text-muted-foreground">
				This runs <code className="font-mono">dokku repo:purge-cache</code> across all apps to
				remove build caches. Volumes are not removed and <code className="font-mono">repo:gc</code>{" "}
				is not run.
			</p>
		),
		visible: (health) => isDiskUnderPressure(health.resources.disk.status),
	},
];

interface HealthMetricBarProps {
	label: string;
	value: number;
	status: HealthStatus;
}

function HealthMetricBar({ label, value, status }: HealthMetricBarProps) {
	return (
		<div>
			<div className="flex justify-between mb-1">
				<span className="text-sm font-medium">{label}</span>
				<span className="text-sm text-muted-foreground">{value.toFixed(1)}%</span>
			</div>
			<div className="w-full bg-muted rounded-full h-2">
				<div
					className={`h-2 rounded-full transition-all ${healthBarClass(status)}`}
					style={{ width: `${value}%` }}
				/>
			</div>
		</div>
	);
}

interface ServerHealthCardProps {
	health: ServerHealth;
	canModify: boolean;
	submittingAction: MaintenanceActionId | null;
	onActionConfirm: (actionId: MaintenanceActionId) => void;
}

export function ServerHealthCard({
	health,
	canModify,
	submittingAction,
	onActionConfirm,
}: ServerHealthCardProps) {
	const [activeActionId, setActiveActionId] = useState<MaintenanceActionId | null>(null);
	const visibleActions = MAINTENANCE_ACTIONS.filter((action) => action.visible(health));
	const activeAction = MAINTENANCE_ACTIONS.find((action) => action.id === activeActionId);

	const handleConfirm = () => {
		if (!activeActionId) {
			return;
		}
		onActionConfirm(activeActionId);
		setActiveActionId(null);
	};

	return (
		<>
			<Card className="mb-6">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
					<CardTitle>Server Health</CardTitle>
					{canModify && (
						<div className="flex flex-wrap gap-2">
							{visibleActions.map((action) => (
								<Button
									key={action.id}
									size="sm"
									variant="outline"
									onClick={() => setActiveActionId(action.id)}
									disabled={submittingAction !== null}
								>
									{action.label}
								</Button>
							))}
						</div>
					)}
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className={healthBannerClass(health.status)}>
							VPS status: {HEALTH_STATUS_LABELS[health.status]}
						</div>
						{METRICS.map(({ key, label }) => (
							<HealthMetricBar
								key={key}
								label={label}
								value={health.resources[key].value}
								status={health.resources[key].status}
							/>
						))}
					</div>
				</CardContent>
			</Card>

			{activeAction && (
				<ConfirmDialog
					visible={activeActionId !== null}
					title={activeAction.title}
					onClose={() => setActiveActionId(null)}
					onConfirm={handleConfirm}
					submitting={submittingAction === activeAction.id}
				>
					{activeAction.description}
				</ConfirmDialog>
			)}
		</>
	);
}
