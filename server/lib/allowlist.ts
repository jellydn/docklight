export const ALLOWED_COMMANDS = ["dokku", "top", "free", "df", "grep", "awk", "curl"] as const;

export type AllowedCommand = (typeof ALLOWED_COMMANDS)[number];

export interface AppCommand {
	command: AllowedCommand;
	args: string[];
}

export function isCommandAllowed(command: string | AppCommand): boolean {
	if (typeof command === "object" && command !== null) {
		return ALLOWED_COMMANDS.includes(command.command);
	}

	const parts = command.split("|").map((p) => p.trim());
	return parts.every((part) => {
		const baseCommand = part.split(" ")[0];
		return ALLOWED_COMMANDS.includes(baseCommand as AllowedCommand);
	});
}
