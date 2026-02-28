import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider.js";
import { apiFetch } from "../lib/api.js";
import { CommandResultSchema, CreateAppResultSchema } from "../lib/schemas.js";

interface CreateAppDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: (appName: string) => void;
}

const APP_NAME_REGEX = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;

export function CreateAppDialog({ open, onOpenChange, onCreated }: CreateAppDialogProps) {
	const [appName, setAppName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [createdAppName, setCreatedAppName] = useState<string | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [deployBranch, setDeployBranch] = useState("");
	const [buildDir, setBuildDir] = useState("");
	const [builder, setBuilder] = useState("");
	const [advancedWarning, setAdvancedWarning] = useState<string | null>(null);
	const navigate = useNavigate();
	const { addToast } = useToast();

	const hostname = typeof window !== "undefined" ? window.location.hostname : "";

	const handleCreate = async () => {
		if (!appName.trim()) {
			setError("App name is required");
			return;
		}

		if (!APP_NAME_REGEX.test(appName)) {
			setError(
				"App name must start with a letter, contain only lowercase letters, numbers, and hyphens, and not end with a hyphen"
			);
			return;
		}

		setError(null);
		setLoading(true);
		setAdvancedWarning(null);

		try {
			await apiFetch("/apps", CreateAppResultSchema, {
				method: "POST",
				body: JSON.stringify({ name: appName }),
			});
			setCreatedAppName(appName);
			onCreated?.(appName);

			if (deployBranch || buildDir || builder) {
				try {
					const result = await apiFetch(
						`/apps/${encodeURIComponent(appName)}/deployment`,
						CommandResultSchema,
						{
							method: "PUT",
							body: JSON.stringify({
								deployBranch: deployBranch || undefined,
								buildDir: buildDir || undefined,
								builder: builder || undefined,
							}),
						}
					);

					if (result.exitCode !== 0) {
						throw new Error(result.stderr || "Failed to apply advanced settings");
					}
				} catch (advErr) {
					const warningMsg =
						advErr instanceof Error ? advErr.message : "Failed to apply advanced settings";
					setAdvancedWarning(warningMsg);
					addToast("error", "App created, but advanced settings failed", {
						command: "",
						exitCode: 1,
						stdout: "",
						stderr: warningMsg,
					});
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create app");
		} finally {
			setLoading(false);
		}
	};

	const [copySuccess, setCopySuccess] = useState(false);

	const handleCopyRemote = async () => {
		const gitRemoteCommand = `git remote add dokku dokku@${hostname}:${createdAppName}`;
		try {
			await navigator.clipboard.writeText(gitRemoteCommand);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch {
			// Fallback: user can manually copy
		}
	};

	const handleGoToApp = () => {
		onOpenChange(false);
		navigate(`/apps/${createdAppName}`);
		resetDialog();
	};

	const handleClose = () => {
		onOpenChange(false);
		resetDialog();
	};

	const resetDialog = () => {
		setAppName("");
		setError(null);
		setLoading(false);
		setCreatedAppName(null);
		setShowAdvanced(false);
		setDeployBranch("");
		setBuildDir("");
		setBuilder("");
		setAdvancedWarning(null);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) resetDialog();
				onOpenChange(isOpen);
			}}
		>
			<DialogContent className="sm:max-w-[500px]">
				{!createdAppName ? (
					<>
						<DialogHeader>
							<DialogTitle>Create New App</DialogTitle>
							<DialogDescription>
								Enter a name for your new Dokku application. The name must start with a letter,
								contain only lowercase letters, numbers, and hyphens, and not end with a hyphen.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<label htmlFor="app-name" className="text-sm font-medium">
									App Name
								</label>
								<Input
									id="app-name"
									placeholder="my-app"
									value={appName}
									onChange={(e) => {
										setAppName(e.target.value);
										setError(null);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											void handleCreate();
										}
									}}
									disabled={loading}
									autoFocus
								/>
								{error && <p className="text-sm text-red-500">{error}</p>}
							</div>

							<div className="border-t pt-4">
								<button
									type="button"
									onClick={() => setShowAdvanced(!showAdvanced)}
									className="flex items-center text-sm text-gray-600 hover:text-gray-900"
								>
									<span className={`mr-2 transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
										▶
									</span>
									Advanced Options
								</button>
							</div>

							{showAdvanced && (
								<div className="space-y-4 pl-4 border-l-2 border-gray-200">
									<div>
										<label htmlFor="deploy-branch" className="block text-sm font-medium mb-1">
											Deploy Branch
										</label>
										<Input
											id="deploy-branch"
											placeholder="main"
											value={deployBranch}
											onChange={(e) => setDeployBranch(e.target.value)}
											disabled={loading}
										/>
									</div>

									<div>
										<label htmlFor="build-dir" className="block text-sm font-medium mb-1">
											Build Directory
										</label>
										<Input
											id="build-dir"
											placeholder="e.g., apps/api"
											value={buildDir}
											onChange={(e) => setBuildDir(e.target.value)}
											disabled={loading}
										/>
										<p className="mt-1 text-xs text-gray-500">
											For monorepo: path to subdirectory (e.g., apps/api)
										</p>
									</div>

									<div>
										<label htmlFor="builder" className="block text-sm font-medium mb-1">
											Builder
										</label>
										<select
											id="builder"
											value={builder}
											onChange={(e) => setBuilder(e.target.value)}
											disabled={loading}
											className="w-full max-w-md border rounded px-3 py-2"
										>
											<option value="">Auto-detect</option>
											<option value="herokuish">Herokuish</option>
											<option value="dockerfile">Dockerfile</option>
											<option value="pack">Cloud Native Buildpacks (pack)</option>
										</select>
									</div>
								</div>
							)}
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={handleClose} disabled={loading}>
								Cancel
							</Button>
							<Button onClick={() => void handleCreate()} disabled={loading || !appName.trim()}>
								{loading ? "Creating..." : "Create App"}
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>App Created!</DialogTitle>
							<DialogDescription>
								Your app "{createdAppName}" has been created successfully.
								{advancedWarning && (
									<span className="block mt-2 text-amber-600">Warning: {advancedWarning}</span>
								)}
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="bg-muted p-4 rounded-lg">
								<p className="text-sm font-medium mb-2">Next Steps</p>
								<div className="space-y-2 text-sm">
									<p>1. Add the Dokku remote to your Git repository:</p>
									<code className="block bg-background p-2 rounded border text-xs break-all">
										git remote add dokku dokku@{hostname}:{createdAppName}
										<button
											type="button"
											className="ml-2 text-blue-500 hover:underline"
											onClick={handleCopyRemote}
											title="Copy to clipboard"
										>
											{copySuccess ? "Copied!" : "Copy"}
										</button>
									</code>
									<p>2. Push your code to Dokku:</p>
									<code className="block bg-background p-2 rounded border text-xs">
										git push dokku main
									</code>
								</div>
							</div>
						</div>
						<DialogFooter className="flex-row justify-between sm:justify-between">
							<Button variant="outline" onClick={handleClose}>
								Close
							</Button>
							<Button onClick={handleGoToApp}>Go to App</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
