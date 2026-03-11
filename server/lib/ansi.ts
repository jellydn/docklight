import stripAnsiLib from "strip-ansi";

export function stripAnsi(value: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching ESC character
	return stripAnsiLib(value).replace(/\x1b/g, "");
}
