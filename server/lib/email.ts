import { logger } from "./logger.js";

export function buildPasswordResetUrl(token: string): string {
	const appUrl = process.env.DOCKLIGHT_APP_URL || "";
	return `${appUrl}/reset-password?token=${token}`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export async function sendPasswordResetEmail(opts: {
	to: string;
	username: string;
	resetUrl: string;
}): Promise<void> {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.RESEND_FROM_EMAIL;

	if (!apiKey || !from) {
		logger.warn(
			"Resend email service is not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL)"
		);
		return;
	}

	logger.info("Sending password reset email");

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			signal: controller.signal,
			body: JSON.stringify({
				from,
				to: opts.to,
				subject: "Reset your Docklight password",
				html: `<p>Hello ${escapeHtml(opts.username)},</p>
<p>You requested to reset your password for Docklight. Click the link below to proceed:</p>
<p><a href="${escapeHtml(opts.resetUrl)}">${escapeHtml(opts.resetUrl)}</a></p>
<p>If you did not request this, you can safely ignore this email.</p>`,
			}),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Failed to send password reset email: ${text}`);
		}
	} finally {
		clearTimeout(timeoutId);
	}
}
