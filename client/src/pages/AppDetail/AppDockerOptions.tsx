import type { DockerOptions } from "../../lib/schemas.js";
import { alertBannerClass } from "@/lib/status-styles.js";

interface AppDockerOptionsProps {
	dockerOptions: DockerOptions | null;
	loading: boolean;
	error: string | null;
	newPhase: "build" | "deploy" | "run";
	newOption: string;
	addSubmitting: boolean;
	clearSubmitting: (phase: "build" | "deploy" | "run") => boolean;
	canModify: boolean;
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
	canModify,
	onPhaseChange,
	onOptionChange,
	onAdd,
	onRemove,
	onClearPhase,
}: AppDockerOptionsProps) {
	return (
		<div className="bg-card rounded-lg border border-border p-6">
			<h2 className="text-lg font-semibold mb-4">Docker Options</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tertiary" />
				</div>
			) : error ? (
				<div className={alertBannerClass("error")}>
					{error}
				</div>
			) : (
				<div className="space-y-6">
					{(["build", "deploy", "run"] as const).map((phase) => {
						const options = dockerOptions?.[phase] || [];
						return (
							<div key={phase} className="border rounded-lg p-4">
								<div className="flex justify-between items-center mb-3">
									<h3 className="text-sm font-medium text-foreground capitalize">{phase} Phase</h3>
									{canModify && options.length > 0 && (
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
												className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
											>
												<code className="font-mono text-sm text-foreground">{option}</code>
												{canModify && (
													<button
														onClick={() => onRemove(phase, option)}
														className="text-red-600 hover:text-red-800 ml-4"
														title="Remove"
														type="button"
													>
														🗑️
													</button>
												)}
											</li>
										))}
									</ul>
								) : (
									<p className="text-muted-foreground text-sm mb-4">
										No {phase} options configured.
									</p>
								)}
							</div>
						);
					})}

					{canModify && (
						<div className="pt-4 border-t">
							<h3 className="text-sm font-medium text-foreground mb-3">Add Docker Option</h3>
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
									aria-label="Docker option"
								/>
								<button
									onClick={onAdd}
									disabled={!newOption || addSubmitting}
									className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
								>
									Add
								</button>
							</div>
							<p className="text-xs text-muted-foreground">
								Enter Docker flags (e.g., --memory=512m, --cpus=0.5, --env VAR=value)
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
