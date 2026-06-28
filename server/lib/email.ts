import { logger } from "./logger.js";

export function buildPasswordResetUrl(token: string): string {
	const appUrl = process.env.DOCKLIGHT_APP_URL || "";
	return `${appUrl}/reset-password?token=${token}`;
}

export async function sendPasswordResetEmail(opts: {
	to: string;
	username: string;
	resetUrl: string;
}): Promise<void> {
	logger.info({ to: opts.to, username: opts.username }, "Password reset email requested");
}
