1|import { useState } from "react";
2|import { Button } from "@/components/ui/button";
3|import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
4|import { ConfirmDialog } from "@/components/ConfirmDialog.js";
5|import { isDiskUnderPressure, type ServerHealth } from "../lib/schemas.js";
6|
7|export type MaintenanceActionId = "cleanup" | "purge";
8|
9|type HealthStatus = ServerHealth["status"];
10|type MetricKey = keyof ServerHealth["resources"];
11|
12|const METRICS: ReadonlyArray<{ key: MetricKey; label: string }> = [
13|	{ key: "cpu", label: "CPU" },
14|	{ key: "memory", label: "Memory" },
15|	{ key: "disk", label: "Disk" },
16|];
17|
18|const HEALTH_STATUS_PRESENTATION: Record<
19|	HealthStatus,
20|	{ label: string; banner: string; bar: string }
21|> = {
22|	ok: {
23|		label: "OK",
24|		banner: "bg-green-50 border-green-200 text-green-800",
25|		bar: "bg-green-500",
26|	},
27|	warning: {
28|		label: "Watch closely",
29|		banner: "bg-yellow-50 border-yellow-200 text-yellow-800",
30|		bar: "bg-yellow-500",
31|	},
32|	critical: {
33|		label: "Warning",
34|		banner: "bg-red-50 border-red-200 text-red-800",
35|		bar: "bg-red-500",
36|	},
37|};
38|
39|const MAINTENANCE_ACTIONS: ReadonlyArray<{
40|	id: MaintenanceActionId;
41|	label: string;
42|	title: string;
43|	description: React.ReactNode;
44|	visible: (health: ServerHealth) => boolean;
45|}> = [
46|	{
47|		id: "cleanup",
48|		label: "Clean unused",
49|		title: "Clean unused Dokku resources",
50|		description: (
51|			<p className="text-sm text-muted-foreground">
52|				This runs <code className="font-mono">dokku cleanup</code> to remove unused containers and
53|				images. Volumes are not removed.
54|			</p>
55|		),
56|		visible: () => true,
57|	},
58|	{
59|		id: "purge",
60|		label: "Purge build caches",
61|		title: "Purge build caches",
62|		description: (
63|			<p className="text-sm text-muted-foreground">
64|				This runs <code className="font-mono">dokku repo:purge-cache</code> across all apps to
65|				remove build caches. Volumes are not removed and <code className="font-mono">repo:gc</code>{" "}
66|				is not run.
67|			</p>
68|		),
69|		visible: (health) => isDiskUnderPressure(health.resources.disk.status),
70|	},
71|];
72|
73|interface HealthMetricBarProps {
74|	label: string;
75|	value: number;
76|	status: HealthStatus;
77|}
78|
79|function HealthMetricBar({ label, value, status }: HealthMetricBarProps) {
80|	const presentation = HEALTH_STATUS_PRESENTATION[status];
81|
82|	return (
83|		<div>
84|			<div className="flex justify-between mb-1">
85|				<span className="text-sm font-medium">{label}</span>
86|				<span className="text-sm text-muted-foreground">{value.toFixed(1)}%</span>
87|			</div>
88|			<div className="w-full bg-muted rounded-full h-2">
89|				<div
90|					className={`h-2 rounded-full transition-all ${presentation.bar}`}
91|					style={{ width: `${value}%` }}
92|				/>
93|			</div>
94|		</div>
95|	);
96|}
97|
98|interface ServerHealthCardProps {
99|	health: ServerHealth;
100|	canModify: boolean;
101|	submittingAction: MaintenanceActionId | null;
102|	onActionConfirm: (actionId: MaintenanceActionId) => void;
103|}
104|
105|export function ServerHealthCard({
106|	health,
107|	canModify,
108|	submittingAction,
109|	onActionConfirm,
110|}: ServerHealthCardProps) {
111|	const [activeActionId, setActiveActionId] = useState<MaintenanceActionId | null>(null);
112|	const statusPresentation = HEALTH_STATUS_PRESENTATION[health.status];
113|	const visibleActions = MAINTENANCE_ACTIONS.filter((action) => action.visible(health));
114|	const activeAction = MAINTENANCE_ACTIONS.find((action) => action.id === activeActionId);
115|
116|	const handleConfirm = () => {
117|		if (!activeActionId) {
118|			return;
119|		}
120|		onActionConfirm(activeActionId);
121|		setActiveActionId(null);
122|	};
123|
124|	return (
125|		<>
126|			<Card className="mb-6">
127|				<CardHeader className="flex flex-row items-center justify-between space-y-0">
128|					<CardTitle>Server Health</CardTitle>
129|					{canModify && (
130|						<div className="flex gap-2">
131|							{visibleActions.map((action) => (
132|								<Button
133|									key={action.id}
134|									size="sm"
135|									variant="outline"
136|									onClick={() => setActiveActionId(action.id)}
137|									disabled={submittingAction !== null}
138|								>
139|									{action.label}
140|								</Button>
141|							))}
142|						</div>
143|					)}
144|				</CardHeader>
145|				<CardContent>
146|					<div className="space-y-4">
147|						<div
148|							className={`rounded-md border px-4 py-3 text-sm font-medium ${statusPresentation.banner}`}
149|						>
150|							VPS status: {statusPresentation.label}
151|						</div>
152|						{METRICS.map(({ key, label }) => (
153|							<HealthMetricBar
154|								key={key}
155|								label={label}
156|								value={health.resources[key].value}
157|								status={health.resources[key].status}
158|							/>
159|						))}
160|					</div>
161|				</CardContent>
162|			</Card>
163|
164|			{activeAction && (
165|				<ConfirmDialog
166|					visible={activeActionId !== null}
167|					title={activeAction.title}
168|					onClose={() => setActiveActionId(null)}
169|					onConfirm={handleConfirm}
170|					submitting={submittingAction === activeAction.id}
171|				>
172|					{activeAction.description}
173|				</ConfirmDialog>
174|			)}
175|		</>
176|	);
177|}
178|