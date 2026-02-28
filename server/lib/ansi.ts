// Removes ANSI escape sequences from terminal output
export function stripAnsi(value: string): string {
	return value.replaceAll("\u001b", "").replace(/\[[0-9;]*m/g, "");
}
