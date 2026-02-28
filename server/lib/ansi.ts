// Removes ANSI escape sequences from terminal output
export function stripAnsi(value: string): string {
	return value
		.split("\u001b")
		.map((segment, index) => {
			if (index === 0) {
				return segment;
			}
			return segment.replace(/^\[[0-9;]*m/, "");
		})
		.join("");
}
