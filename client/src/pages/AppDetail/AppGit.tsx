import { useState } from "react";
import type { GitInfo } from "@/lib/schemas.js";
import { formatDeployTime } from "@/lib/utils.js";

interface AppGitProps {
	gitInfo: GitInfo | null;
	loading: boolean;
	error: string | null;
	syncing: boolean;
	canModify: boolean;
	onSync: (repo: string, branch: string) => void;
	onUnlock?: () => void;
}

function formatSha(sha: string): string {
	if (!sha || sha === "-" || sha === "HEAD") return "-";
	return sha.length > 7 ? sha.slice(0, 7) : sha;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between py-3">
			<span className="text-sm text-gray-500">{label}</span>
			<span className="text-sm text-gray-900">{children}</span>
		</div>
	);
}

export function AppGit({
	gitInfo,
	loading,
	error,
	syncing,
	canModify,
	onSync,
	onUnlock,
}: AppGitProps) {
	const [repoUrl, setRepoUrl] = useState("");
	const [branch, setBranch] = useState("");

	const handleSync = () => {
		if (!repoUrl.trim()) return;
		onSync(repoUrl.trim(), branch.trim());
	};

	const isLockedError = (err: string): boolean => {
		const lower = err.toLowerCase();
		return (
			lower.includes("app locked") ||
			lower.includes("directory is locked") ||
			lower.includes("git lock") ||
			/\blocked:\s*(true|1)/.test(lower)
		);
	};

	const deployBranch = gitInfo?.deployBranch || gitInfo?.globalDeployBranch || "-";

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold mb-2">Git</h2>
				{loading ? (
					<div className="flex justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					</div>
				) : error ? (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
						<p>{error}</p>
						{onUnlock && isLockedError(error) && (
							<button
								type="button"
								onClick={onUnlock}
								className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
							>
								Unlock App
							</button>
						)}
					</div>
				) : gitInfo ? (
					<div className="divide-y divide-gray-100">
						<InfoRow label="Branch">
							<code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
								{deployBranch}
							</code>
						</InfoRow>
						<InfoRow label="Commit">
							<code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
								{formatSha(gitInfo.sha)}
							</code>
						</InfoRow>
						<InfoRow label="Last Deployed">{formatDeployTime(gitInfo.lastUpdatedAt)}</InfoRow>
						{gitInfo.sourceImage && (
							<InfoRow label="Source Image">
								<code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono break-all">
									{gitInfo.sourceImage}
								</code>
							</InfoRow>
						)}
					</div>
				) : null}
			</div>

			{canModify && (
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-1">Deploy from Repository</h2>
					<p className="text-sm text-gray-500 mb-4">
						Deploy directly from a remote Git repository.
					</p>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSync();
						}}
						className="space-y-4"
					>
						<div>
							<label
								htmlFor="git-repo-url"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Repository URL
							</label>
							<input
								id="git-repo-url"
								type="text"
								value={repoUrl}
								onChange={(e) => setRepoUrl(e.target.value)}
								placeholder="https://github.com/user/repo.git"
								className="w-full max-w-lg border rounded px-3 py-2"
							/>
							<p className="mt-1 text-xs text-gray-400">
								HTTPS, SSH (
								<code className="bg-gray-100 px-1 rounded">git@github.com:user/repo.git</code>
								), or <code className="bg-gray-100 px-1 rounded">ssh://</code>
							</p>
						</div>
						<div>
							<label htmlFor="git-branch" className="block text-sm font-medium text-gray-700 mb-1">
								Branch
							</label>
							<input
								id="git-branch"
								type="text"
								value={branch}
								onChange={(e) => setBranch(e.target.value)}
								placeholder={deployBranch !== "-" ? deployBranch : "main"}
								className="w-full max-w-xs border rounded px-3 py-2"
							/>
							<p className="mt-1 text-xs text-gray-400">Defaults to the configured deploy branch</p>
						</div>
						<div className="pt-2">
							<button
								type="submit"
								disabled={syncing || !repoUrl.trim()}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{syncing ? "Deploying..." : "Deploy"}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
