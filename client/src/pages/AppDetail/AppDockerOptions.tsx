import type { DockerOptions } from "../../lib/schemas.js";

interface AppDockerOptionsProps {
	dockerOptions: DockerOptions | null;
	loading: boolean;
	error: string | null;
	newPhase: "build" | "deploy" | "run";
	newOption: string;
	addSubmitting: boolean;
	clearSubmitting: (phase: "build" | "deploy" | "run") => boolean;
	onPhaseChange: (phase: "build" | "deploy" | "run") => void;
	onOptionChange: (option: string) => void;
	onAdd: () => void;
	onRemove: (phase: "build" | "deploy" | "run", option: string) => void;
	onClearPhase: (phase: "build" | "deploy" | "run") => void;
}

export function AppDockerOptions({
	dockerOptions,
	loading,
	error,
	newPhase,
	newOption,
	addSubmitting,
	clearSubmitting,
	onPhaseChange,
	onOptionChange,
	onAdd,
	onRemove,
	onClearPhase,
}: AppDockerOptionsProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Docker Options</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<div className="space-y-6">
					{(["build", "deploy", "run"] as const).map((phase) => {
						const options = dockerOptions?.[phase] || [];
						return (
							<div key={phase} className="border rounded-lg p-4">
								<div className="flex justify-between items-center mb-3">
									<h3 className="text-sm font-medium text-gray-700 capitalize">
										{phase} Phase
									</h3>
									{options.length > 0 && (
										<button
											onClick={() => onClearPhase(phase)}
											disabled={clearSubmitting(phase)}
											className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
											type="button"
										>
											Clear Phase
										</button>
									)}
								</div>

								{options.length > 0 ? (
									<ul className="space-y-2 mb-4">
										{options.map((option) => (
											<li
												key={option}
												className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
											>
												<code className="font-mono text-sm text-gray-800">{option}</code>
												<button
													onClick={() => onRemove(phase, option)}
													className="text-red-600 hover:text-red-800 ml-4"
													title="Remove"
													type="button"
												>
													🗑️
												</button>
											</li>
										))}
									</ul>
								) : (
									<p className="text-gray-500 text-sm mb-4">
										No {phase} options configured.
									</p>
								)}
							</div>
						);
					})}

					<div className="pt-4 border-t">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Add Docker Option</h3>
						<div className="flex flex-col sm:flex-row gap-2 mb-2">
							<select
								value={newPhase}
								onChange={(e) => onPhaseChange(e.target.value as "build" | "deploy" | "run")}
								className="border rounded px-3 py-2"
							>
								<option value="build">Build</option>
								<option value="deploy">Deploy</option>
								<option value="run">Run</option>
							</select>
							<input
								type="text"
								placeholder="e.g., --memory=512m --cpus=0.5"
								value={newOption}
								onChange={(e) => onOptionChange(e.target.value)}
								className="flex-1 border rounded px-3 py-2 font-mono text-sm"
							/>
							<button
								onClick={onAdd}
								disabled={!newOption || addSubmitting}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
								type="button"
							>
								Add
							</button>
						</div>
						<p className="text-xs text-gray-500">
							Enter Docker flags (e.g., --memory=512m, --cpus=0.5, --env VAR=value)
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
