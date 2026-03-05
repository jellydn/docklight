import { useMutation, useQuery } from "@tanstack/react-query";
import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api.js";
import { queryClient } from "@/lib/query-client.js";
import { queryKeys } from "@/lib/query-keys.js";
import { ServerSettingsSchema, type ServerSettings } from "@/lib/schemas.js";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

export function Settings(): JSX.Element {
	const {
		data: settings,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.settings,
		queryFn: () => apiFetch("/settings", ServerSettingsSchema),
	});

	const [form, setForm] = useState<ServerSettings>({
		dokkuSshTarget: "",
		dokkuSshKeyPath: "",
		logLevel: "info",
	});
	const [saveError, setSaveError] = useState("");
	const [saveSuccess, setSaveSuccess] = useState(false);
	const isDirty = useRef(false);
	const successTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		if (settings && !isDirty.current) {
			setForm(settings);
		}
	}, [settings]);

	useEffect(() => {
		return () => {
			if (successTimerRef.current) {
				clearTimeout(successTimerRef.current);
			}
		};
	}, []);

	const handleFieldChange = useCallback((updater: (prev: ServerSettings) => ServerSettings) => {
		isDirty.current = true;
		setForm(updater);
	}, []);

	const updateMutation = useMutation({
		mutationFn: (data: Partial<ServerSettings>) =>
			apiFetch("/settings", ServerSettingsSchema, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (updated) => {
			queryClient.setQueryData(queryKeys.settings, updated);
			isDirty.current = false;
			setSaveError("");
			setSaveSuccess(true);
			successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
		},
		onError: (err: Error) => {
			setSaveError(err.message || "Failed to save settings");
			setSaveSuccess(false);
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		e.preventDefault();
		setSaveError("");
		setSaveSuccess(false);
		updateMutation.mutate(form);
	};

	const errorMessage = error?.message || "";

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Server Settings</h1>

			{errorMessage && (
				<div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 mb-6">
					{errorMessage}
				</div>
			)}

			{isLoading ? (
				<p className="text-gray-500">Loading…</p>
			) : (
				<form onSubmit={handleSubmit}>
					<div className="bg-white rounded-lg shadow p-6 mb-6">
						<h2 className="text-lg font-semibold mb-4">Dokku SSH Connection</h2>
						<p className="text-sm text-gray-500 mb-4">
							Settings saved here take effect immediately without a server restart.
						</p>
						<div className="flex flex-col gap-4">
							<div>
								<label htmlFor="ssh-target" className="block text-sm font-medium mb-1">
									SSH Target
								</label>
								<input
									id="ssh-target"
									type="text"
									value={form.dokkuSshTarget}
									onChange={(e) =>
										handleFieldChange((f) => ({ ...f, dokkuSshTarget: e.target.value }))
									}
									className="w-full px-3 py-2 border rounded-md text-sm font-mono"
									placeholder="dokku@your-server-ip"
									autoComplete="off"
								/>
								<p className="text-xs text-gray-400 mt-1">
									Format: user@host or user@host:port (e.g. dokku@192.168.1.1)
								</p>
							</div>
							<div>
								<label htmlFor="ssh-key-path" className="block text-sm font-medium mb-1">
									SSH Key Path
								</label>
								<input
									id="ssh-key-path"
									type="text"
									value={form.dokkuSshKeyPath}
									onChange={(e) =>
										handleFieldChange((f) => ({ ...f, dokkuSshKeyPath: e.target.value }))
									}
									className="w-full px-3 py-2 border rounded-md text-sm font-mono"
									placeholder="/app/.ssh/id_ed25519"
									autoComplete="off"
								/>
								<p className="text-xs text-gray-400 mt-1">
									Absolute path to the SSH private key file on the server
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6 mb-6">
						<h2 className="text-lg font-semibold mb-4">Logging</h2>
						<div>
							<label htmlFor="log-level" className="block text-sm font-medium mb-1">
								Log Level
							</label>
							<select
								id="log-level"
								value={form.logLevel}
								onChange={(e) =>
									handleFieldChange((f) => ({
										...f,
										logLevel: e.target.value as ServerSettings["logLevel"],
									}))
								}
								className="w-full sm:w-48 px-3 py-2 border rounded-md text-sm"
							>
								{LOG_LEVELS.map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
						</div>
					</div>

					{saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}
					{saveSuccess && (
						<p className="text-green-600 text-sm mb-4">Settings saved successfully.</p>
					)}

					<button
						type="submit"
						disabled={updateMutation.isPending}
						className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
					>
						{updateMutation.isPending ? "Saving…" : "Save Settings"}
					</button>
				</form>
			)}
		</div>
	);
}
