1|import { useState } from "react";
2|import { useNavigate } from "react-router-dom";
3|import { Button } from "@/components/ui/button";
4|import {
5|	Dialog,
6|	DialogContent,
7|	DialogDescription,
8|	DialogFooter,
9|	DialogHeader,
10|	DialogTitle,
11|} from "@/components/ui/dialog";
12|import { Input } from "@/components/ui/input";
13|import { useStreamingAction } from "../hooks/use-streaming-action.js";
14|import { apiFetch } from "../lib/api.js";
15|import { CreateAppResultSchema } from "../lib/schemas.js";
16|
17|interface CreateAppDialogProps {
18|	open: boolean;
19|	onOpenChange: (open: boolean) => void;
20|	onCreated?: (appName: string) => void;
21|}
22|
23|const APP_NAME_REGEX = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;
24|
25|export function CreateAppDialog({ open, onOpenChange, onCreated }: CreateAppDialogProps) {
26|	const [appName, setAppName] = useState("");
27|	const [error, setError] = useState<string | null>(null);
28|	const [loading, setLoading] = useState(false);
29|	const [createdAppName, setCreatedAppName] = useState<string | null>(null);
30|	const [showAdvanced, setShowAdvanced] = useState(false);
31|	const [deployBranch, setDeployBranch] = useState("");
32|	const [buildDir, setBuildDir] = useState("");
33|	const [builder, setBuilder] = useState("");
34|	const [advancedWarning, setAdvancedWarning] = useState<string | null>(null);
35|	const navigate = useNavigate();
36|	const { execute: streamAction } = useStreamingAction();
37|
38|	const hostname = typeof window !== "undefined" ? window.location.hostname : "";
39|
40|	const handleCreate = async () => {
41|		if (!appName.trim()) {
42|			setError("App name is required");
43|			return;
44|		}
45|
46|		if (!APP_NAME_REGEX.test(appName)) {
47|			setError(
48|				"App name must start with a letter, contain only lowercase letters, numbers, and hyphens, and not end with a hyphen"
49|			);
50|			return;
51|		}
52|
53|		setError(null);
54|		setLoading(true);
55|		setAdvancedWarning(null);
56|
57|		try {
58|			await apiFetch("/apps", CreateAppResultSchema, {
59|				method: "POST",
60|				body: JSON.stringify({ name: appName }),
61|			});
62|			setCreatedAppName(appName);
63|			onCreated?.(appName);
64|
65|			if (deployBranch || buildDir || builder) {
66|				const result = await streamAction(
67|					`/apps/${encodeURIComponent(appName)}/deployment`,
68|					"deployment:update",
69|					{
70|						method: "PUT",
71|						body: JSON.stringify({
72|							deployBranch: deployBranch || undefined,
73|							buildDir: buildDir || undefined,
74|							builder: builder || undefined,
75|						}),
76|						onError: () => {
77|							setAdvancedWarning("Failed to apply advanced settings");
78|						},
79|					}
80|				);
81|
82|				if (!result || result.exitCode !== 0) {
83|					setAdvancedWarning(result?.stderr || "Failed to apply advanced settings");
84|				}
85|			}
86|		} catch (err) {
87|			setError(err instanceof Error ? err.message : "Failed to create app");
88|		} finally {
89|			setLoading(false);
90|		}
91|	};
92|
93|	const [copySuccess, setCopySuccess] = useState(false);
94|
95|	const handleCopyRemote = async () => {
96|		const gitRemoteCommand = `git remote add dokku dokku@${hostname}:${createdAppName}`;
97|		try {
98|			await navigator.clipboard.writeText(gitRemoteCommand);
99|			setCopySuccess(true);
100|			setTimeout(() => setCopySuccess(false), 2000);
101|		} catch {
102|			// Fallback: user can manually copy
103|		}
104|	};
105|
106|	const handleGoToApp = () => {
107|		onOpenChange(false);
108|		navigate(`/apps/${createdAppName}`);
109|		resetDialog();
110|	};
111|
112|	const handleClose = () => {
113|		onOpenChange(false);
114|		resetDialog();
115|	};
116|
117|	const resetDialog = () => {
118|		setAppName("");
119|		setError(null);
120|		setLoading(false);
121|		setCreatedAppName(null);
122|		setShowAdvanced(false);
123|		setDeployBranch("");
124|		setBuildDir("");
125|		setBuilder("");
126|		setAdvancedWarning(null);
127|	};
128|
129|	return (
130|		<Dialog
131|			open={open}
132|			onOpenChange={(isOpen) => {
133|				if (!isOpen) resetDialog();
134|				onOpenChange(isOpen);
135|			}}
136|		>
137|			<DialogContent className="sm:max-w-[500px]">
138|				{!createdAppName ? (
139|					<>
140|						<DialogHeader>
141|							<DialogTitle>Create New App</DialogTitle>
142|							<DialogDescription>
143|								Enter a name for your new Dokku application. The name must start with a letter,
144|								contain only lowercase letters, numbers, and hyphens, and not end with a hyphen.
145|							</DialogDescription>
146|						</DialogHeader>
147|						<div className="grid gap-4 py-4">
148|							<div className="grid gap-2">
149|								<label htmlFor="app-name" className="text-sm font-medium">
150|									App Name
151|								</label>
152|								<Input
153|									id="app-name"
154|									placeholder="my-app"
155|									value={appName}
156|									onChange={(e) => {
157|										setAppName(e.target.value);
158|										setError(null);
159|									}}
160|									onKeyDown={(e) => {
161|										if (e.key === "Enter") {
162|											void handleCreate();
163|										}
164|									}}
165|									disabled={loading}
166|									autoFocus
167|								/>
168|								{error && <p className="text-sm text-red-500">{error}</p>}
169|							</div>
170|
171|							<div className="border-t pt-4">
172|								<button
173|									type="button"
174|									onClick={() => setShowAdvanced(!showAdvanced)}
175|									className="flex items-center text-sm text-muted-foreground hover:text-foreground"
176|								>
177|									<span className={`mr-2 transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
178|										▶
179|									</span>
180|									Advanced Options
181|								</button>
182|							</div>
183|
184|							{showAdvanced && (
185|								<div className="space-y-4 pl-4 border-l-2 border-gray-200">
186|									<div>
187|										<label htmlFor="deploy-branch" className="block text-sm font-medium mb-1">
188|											Deploy Branch
189|										</label>
190|										<Input
191|											id="deploy-branch"
192|											placeholder="main"
193|											value={deployBranch}
194|											onChange={(e) => setDeployBranch(e.target.value)}
195|											disabled={loading}
196|										/>
197|									</div>
198|
199|									<div>
200|										<label htmlFor="build-dir" className="block text-sm font-medium mb-1">
201|											Build Directory
202|										</label>
203|										<Input
204|											id="build-dir"
205|											placeholder="e.g., apps/api"
206|											value={buildDir}
207|											onChange={(e) => setBuildDir(e.target.value)}
208|											disabled={loading}
209|										/>
210|										<p className="mt-1 text-xs text-muted-foreground">
211|											For monorepo: path to subdirectory (e.g., apps/api)
212|										</p>
213|									</div>
214|
215|									<div>
216|										<label htmlFor="builder" className="block text-sm font-medium mb-1">
217|											Builder
218|										</label>
219|										<select
220|											id="builder"
221|											value={builder}
222|											onChange={(e) => setBuilder(e.target.value)}
223|											disabled={loading}
224|											className="w-full max-w-md border rounded px-3 py-2"
225|										>
226|											<option value="">Auto-detect</option>
227|											<option value="herokuish">Herokuish</option>
228|											<option value="dockerfile">Dockerfile</option>
229|											<option value="pack">Cloud Native Buildpacks (pack)</option>
230|										</select>
231|									</div>
232|								</div>
233|							)}
234|						</div>
235|						<DialogFooter>
236|							<Button variant="outline" onClick={handleClose} disabled={loading}>
237|								Cancel
238|							</Button>
239|							<Button onClick={() => void handleCreate()} disabled={loading || !appName.trim()}>
240|								{loading ? "Creating..." : "Create App"}
241|							</Button>
242|						</DialogFooter>
243|					</>
244|				) : (
245|					<>
246|						<DialogHeader>
247|							<DialogTitle>App Created!</DialogTitle>
248|							<DialogDescription>
249|								Your app "{createdAppName}" has been created successfully.
250|								{advancedWarning && (
251|									<span className="block mt-2 text-amber-600">Warning: {advancedWarning}</span>
252|								)}
253|							</DialogDescription>
254|						</DialogHeader>
255|						<div className="grid gap-4 py-4">
256|							<div className="bg-muted p-4 rounded-lg">
257|								<p className="text-sm font-medium mb-2">Next Steps</p>
258|								<div className="space-y-2 text-sm">
259|									<p>1. Add the Dokku remote to your Git repository:</p>
260|									<code className="block bg-background p-2 rounded border text-xs break-all">
261|										git remote add dokku dokku@{hostname}:{createdAppName}
262|										<button
263|											type="button"
264|											className="ml-2 text-blue-500 hover:underline"
265|											onClick={handleCopyRemote}
266|											title="Copy to clipboard"
267|										>
268|											{copySuccess ? "Copied!" : "Copy"}
269|										</button>
270|									</code>
271|									<p>2. Push your code to Dokku:</p>
272|									<code className="block bg-background p-2 rounded border text-xs">
273|										git push dokku main
274|									</code>
275|								</div>
276|							</div>
277|						</div>
278|						<DialogFooter className="flex-row justify-between sm:justify-between">
279|							<Button variant="outline" onClick={handleClose}>
280|								Close
281|							</Button>
282|							<Button onClick={handleGoToApp}>Go to App</Button>
283|						</DialogFooter>
284|					</>
285|				)}
286|			</DialogContent>
287|		</Dialog>
288|	);
289|}
290|