export const ALLOWED_COMMANDS = ["dokku", "top", "free", "df"] as const;

export type AllowedCommand = (typeof ALLOWED_COMMANDS)[number];

export function isCommandAllowed(command: string): boolean {
	const baseCommand = command.split(" ")[0];
	return ALLOWED_COMMANDS.includes(baseCommand as AllowedCommand);
}
