// Removes ANSI escape sequences from terminal output
export function stripAnsi(value: string): string {
	const ansiPattern = new RegExp("\\u001b\\[[0-9;]*m", "g");
	return value.replace(ansiPattern, "").replaceAll("\u001b", "");
}
