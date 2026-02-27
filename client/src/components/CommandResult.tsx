import type { CommandResult } from "./types.js";

export function CommandResultComponent({ result }: { result: CommandResult }) {
	return (
		<div className="bg-gray-100 rounded p-4">
			<h3 className="font-semibold mb-2">Command Output</h3>
			<div className="text-sm">
				<div className="mb-2">
					<strong>Command:</strong> {result.command}
				</div>
				<div className="mb-2">
					<strong>Exit Code:</strong>{" "}
					<span className={result.exitCode === 0 ? "text-green-600" : "text-red-600"}>
						{result.exitCode}
					</span>
				</div>
				{result.stdout && (
					<div className="mb-2">
						<strong>Output:</strong>
						<pre className="bg-white p-2 rounded mt-1 overflow-x-auto">{result.stdout}</pre>
					</div>
				)}
				{result.stderr && (
					<div>
						<strong>Error:</strong>
						<pre className="bg-red-50 p-2 rounded mt-1 overflow-x-auto text-red-800">
							{result.stderr}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}
