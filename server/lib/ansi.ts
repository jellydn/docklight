import stripAnsiLib from "strip-ansi";

export function stripAnsi(value: string): string {
	return stripAnsiLib(value);
}
