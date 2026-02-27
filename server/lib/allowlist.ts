export const ALLOWED_COMMANDS = ["dokku", "top", "free", "df", "grep", "awk"] as const;

export type AllowedCommand = (typeof ALLOWED_COMMANDS)[number];

export function isCommandAllowed(command: string): boolean {
	const parts = command.split("|").map((p) => p.trim());
	return parts.every((part) => {
		const baseCommand = part.split(" ")[0];
		return ALLOWED_COMMANDS.includes(baseCommand as AllowedCommand);
	});
}
