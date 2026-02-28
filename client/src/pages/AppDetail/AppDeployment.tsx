import type { DeploymentSettings } from "../../lib/schemas.js";

interface AppDeploymentProps {
	settings: DeploymentSettings | null;
	loading: boolean;
	error: string | null;
	deployBranch: string;
	buildDir: string;
	builder: string;
	submitting: boolean;
	onDeployBranchChange: (value: string) => void;
	onBuildDirChange: (value: string) => void;
	onBuilderChange: (value: string) => void;
	onSave: () => void;
}

export function AppDeployment({
	// settings is passed for future use but not currently needed in the component
	settings: _settings,
	loading,
	error,
	deployBranch,
	buildDir,
	builder,
	submitting,
	onDeployBranchChange,
	onBuildDirChange,
	onBuilderChange,
	onSave,
}: AppDeploymentProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Deployment Settings</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<div className="space-y-4">
					<div>
						<label
							htmlFor="deploy-branch"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Deploy Branch
						</label>
						<input
							id="deploy-branch"
							type="text"
							value={deployBranch}
							onChange={(e) => onDeployBranchChange(e.target.value)}
							placeholder="main"
							className="w-full max-w-md border rounded px-3 py-2"
						/>
						<p className="mt-1 text-sm text-gray-500">
							The branch to deploy (default: main)
						</p>
					</div>

					<div>
						<label
							htmlFor="build-dir"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Build Directory
						</label>
						<input
							id="build-dir"
							type="text"
							value={buildDir}
							onChange={(e) => onBuildDirChange(e.target.value)}
							placeholder="e.g., apps/api"
							className="w-full max-w-md border rounded px-3 py-2"
						/>
						<p className="mt-1 text-sm text-gray-500">
							Set a subdirectory to deploy from when using a monorepo
						</p>
					</div>

					<div>
						<label
							htmlFor="builder"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Builder
						</label>
						<select
							id="builder"
							value={builder}
							onChange={(e) => onBuilderChange(e.target.value)}
							className="w-full max-w-md border rounded px-3 py-2"
						>
							<option value="">Auto-detect</option>
							<option value="herokuish">Herokuish</option>
							<option value="dockerfile">Dockerfile</option>
							<option value="pack">Cloud Native Buildpacks (pack)</option>
						</select>
						<p className="mt-1 text-sm text-gray-500">
							The build strategy to use for this app
						</p>
					</div>

					<div className="pt-4">
						<button
							onClick={onSave}
							disabled={submitting}
							className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							type="button"
						>
							{submitting ? "Saving..." : "Save Settings"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
