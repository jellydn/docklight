import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { ServerConfigSchema, type ServerConfig } from "../lib/schemas.js";

const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal", "silent"];

export function Settings() {
	const [config, setConfig] = useState<ServerConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [saveError, setSaveError] = useState("");
	const [saveSuccess, setSaveSuccess] = useState(false);

	// Form state
	const [dokkuSshTarget, setDokkuSshTarget] = useState("");
	const [dokkuSshRootTarget, setDokkuSshRootTarget] = useState("");
	const [dokkuSshKeyPath, setDokkuSshKeyPath] = useState("");
	const [dokkuSshOpts, setDokkuSshOpts] = useState("");
	const [logLevel, setLogLevel] = useState("info");

	const loadConfig = async () => {
		try {
			setLoading(true);
			const data = await apiFetch("/server/config", ServerConfigSchema);
			setConfig(data);
			setDokkuSshTarget(data.dokkuSshTarget);
			setDokkuSshRootTarget(data.dokkuSshRootTarget);
			setDokkuSshKeyPath(data.dokkuSshKeyPath);
			setDokkuSshOpts(data.dokkuSshOpts);
			setLogLevel(data.logLevel);
			setError("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load configuration");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadConfig();
	}, []);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaveError("");
		setSaveSuccess(false);
		setSaving(true);

		try {
			const updated = await apiFetch("/server/config", ServerConfigSchema, {
				method: "PUT",
				body: JSON.stringify({
					dokkuSshTarget,
					dokkuSshRootTarget,
					dokkuSshKeyPath,
					dokkuSshOpts,
					logLevel,
				}),
			});
			setConfig(updated);
			setSaveSuccess(true);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : "Failed to save configuration");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div>
				<h1 className="text-2xl font-bold mb-6">Server Settings</h1>
				<p className="text-gray-500">Loading…</p>
			</div>
		);
	}

	if (error && !config) {
		return (
			<div>
				<h1 className="text-2xl font-bold mb-6">Server Settings</h1>
				<p className="text-red-600">{error}</p>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Server Settings</h1>

			<form onSubmit={handleSave} className="space-y-6">
				{/* SSH Configuration */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">Dokku SSH Configuration</h2>
					<p className="text-sm text-gray-500 mb-4">
						Changes to SSH settings are applied immediately without a server restart.
					</p>
					<div className="grid grid-cols-1 gap-4">
						<div>
							<label htmlFor="dokku-ssh-target" className="block text-sm font-medium mb-1">
								SSH Target
							</label>
							<input
								id="dokku-ssh-target"
								type="text"
								value={dokkuSshTarget}
								onChange={(e) => setDokkuSshTarget(e.target.value)}
								className="w-full px-3 py-2 border rounded-md text-sm"
								placeholder="dokku@your-server-ip"
							/>
							<p className="text-xs text-gray-400 mt-1">
								Format: user@host or user@host:port (e.g. dokku@192.168.1.1)
							</p>
						</div>
						<div>
							<label htmlFor="dokku-ssh-root-target" className="block text-sm font-medium mb-1">
								Root SSH Target
							</label>
							<input
								id="dokku-ssh-root-target"
								type="text"
								value={dokkuSshRootTarget}
								onChange={(e) => setDokkuSshRootTarget(e.target.value)}
								className="w-full px-3 py-2 border rounded-md text-sm"
								placeholder="root@your-server-ip"
							/>
							<p className="text-xs text-gray-400 mt-1">
								Used for plugin management commands. Format: user@host (e.g. root@192.168.1.1)
							</p>
						</div>
						<div>
							<label htmlFor="dokku-ssh-key-path" className="block text-sm font-medium mb-1">
								SSH Key Path
							</label>
							<input
								id="dokku-ssh-key-path"
								type="text"
								value={dokkuSshKeyPath}
								onChange={(e) => setDokkuSshKeyPath(e.target.value)}
								className="w-full px-3 py-2 border rounded-md text-sm"
								placeholder="/home/user/.ssh/id_rsa"
							/>
							<p className="text-xs text-gray-400 mt-1">
								Path to SSH private key file on the server running Docklight
							</p>
						</div>
						<div>
							<label htmlFor="dokku-ssh-opts" className="block text-sm font-medium mb-1">
								SSH Options
							</label>
							<input
								id="dokku-ssh-opts"
								type="text"
								value={dokkuSshOpts}
								onChange={(e) => setDokkuSshOpts(e.target.value)}
								className="w-full px-3 py-2 border rounded-md text-sm"
								placeholder="-o StrictHostKeyChecking=no"
							/>
							<p className="text-xs text-gray-400 mt-1">
								Leave empty to use the default options
							</p>
						</div>
					</div>
				</div>

				{/* Logging */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">Logging</h2>
					<div>
						<label htmlFor="log-level" className="block text-sm font-medium mb-1">
							Log Level
						</label>
						<select
							id="log-level"
							value={logLevel}
							onChange={(e) => setLogLevel(e.target.value)}
							className="px-3 py-2 border rounded-md text-sm"
						>
							{LOG_LEVELS.map((level) => (
								<option key={level} value={level}>
									{level}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Save */}
				<div className="flex items-center gap-4">
					<button
						type="submit"
						disabled={saving}
						className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
					>
						{saving ? "Saving…" : "Save Settings"}
					</button>
					{saveSuccess && (
						<p className="text-green-600 text-sm">Settings saved successfully.</p>
					)}
					{saveError && <p className="text-red-600 text-sm">{saveError}</p>}
				</div>
			</form>
		</div>
	);
}
