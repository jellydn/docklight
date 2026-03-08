import { useState } from "react";
import type { GitInfo } from "@/lib/schemas.js";

interface AppGitProps {
	gitInfo: GitInfo | null;
	loading: boolean;
	error: string | null;
	syncing: boolean;
	canModify: boolean;
	onSync: (repo: string, branch: string) => void;
	onUnlock?: () => void;
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

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold mb-4">Git Information</h2>
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
					<div className="space-y-3">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div>
								<span className="text-sm font-medium text-gray-500">Deploy Branch</span>
								<p className="mt-1">
									<code className="bg-gray-100 px-2 py-1 rounded text-sm">
										{gitInfo.deployBranch || "-"}
									</code>
								</p>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-500">Global Deploy Branch</span>
								<p className="mt-1">
									<code className="bg-gray-100 px-2 py-1 rounded text-sm">
										{gitInfo.globalDeployBranch || "-"}
									</code>
								</p>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-500">Commit SHA</span>
								<p className="mt-1">
									<code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-xs">
										{gitInfo.sha || "-"}
									</code>
								</p>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-500">Last Updated</span>
								<p className="mt-1 text-sm text-gray-700">{gitInfo.lastUpdatedAt || "-"}</p>
							</div>
							{gitInfo.sourceImage && (
								<div className="sm:col-span-2">
									<span className="text-sm font-medium text-gray-500">Source Image</span>
									<p className="mt-1">
										<code className="bg-gray-100 px-2 py-1 rounded text-sm break-all">
											{gitInfo.sourceImage}
										</code>
									</p>
								</div>
							)}
						</div>
					</div>
				) : null}
			</div>

			{canModify && (
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-2">Deploy from Remote Repository</h2>
					<p className="text-sm text-gray-500 mb-4">
						Connect and deploy your app directly from a remote Git repository (GitHub, GitLab,
						Bitbucket, etc.), similar to how Vercel works.
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
							<p className="mt-1 text-sm text-gray-500">
								Supports HTTPS, SSH (
								<code className="text-xs bg-gray-100 px-1 rounded">
									git@github.com:user/repo.git
								</code>
								), and <code className="text-xs bg-gray-100 px-1 rounded">ssh://</code> URLs
							</p>
						</div>
						<div>
							<label htmlFor="git-branch" className="block text-sm font-medium text-gray-700 mb-1">
								Branch (optional)
							</label>
							<input
								id="git-branch"
								type="text"
								value={branch}
								onChange={(e) => setBranch(e.target.value)}
								placeholder="main"
								className="w-full max-w-xs border rounded px-3 py-2"
							/>
							<p className="mt-1 text-sm text-gray-500">
								Leave blank to use the configured deploy branch
							</p>
						</div>
						<div className="pt-2">
							<button
								type="submit"
								disabled={syncing || !repoUrl.trim()}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{syncing ? "Deploying..." : "Deploy from Repository"}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
