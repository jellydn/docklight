import type { SSLStatus } from "../../lib/schemas.js";
import { alertBannerClass } from "@/lib/status-styles.js";

interface AppSSLProps {
	sslStatus: SSLStatus | null;
	loading: boolean;
	error: string | null;
	email: string;
	submitting: boolean;
	canModify: boolean;
	onEmailChange: (email: string) => void;
	onEnable: () => void;
	onRenew: () => void;
}

export function AppSSL({
	sslStatus,
	loading,
	error,
	email,
	submitting,
	canModify,
	onEmailChange,
	onEnable,
	onRenew,
}: AppSSLProps) {
	return (
		<div className="bg-card rounded-lg border border-border p-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">SSL Certificate</h2>
			</div>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tertiary" />
				</div>
			) : error ? (
				<div className={alertBannerClass("error")}>
					{error}
				</div>
			) : (
				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 bg-muted/50 rounded">
						<div>
							<strong className="text-foreground">Status:</strong>{" "}
							{sslStatus?.active ? (
								<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-success-surface text-success-on-surface">
									Active
								</span>
							) : (
								<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-muted text-foreground">
									Inactive
								</span>
							)}
						</div>
						{sslStatus?.certProvider && (
							<div>
								<strong className="text-foreground">Provider:</strong>{" "}
								<span className="ml-2 text-sm">{sslStatus.certProvider}</span>
							</div>
						)}
					</div>

					{sslStatus?.expiryDate && (
						<div className="flex items-center p-4 bg-muted/50 rounded">
							<strong className="text-foreground">Expiry Date:</strong>
							<span className="ml-2 text-sm">{sslStatus.expiryDate}</span>
						</div>
					)}

					{canModify && (
						<div className="pt-4 border-t">
							{sslStatus?.active ? (
								<button
									onClick={onRenew}
									disabled={submitting}
									className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
								>
									Renew Certificate
								</button>
							) : (
								<div className="space-y-3">
									<div>
										<label
											htmlFor="ssl-email"
											className="block text-sm font-medium text-foreground mb-1"
										>
											Let's Encrypt Email
										</label>
										<input
											id="ssl-email"
											type="email"
											value={email}
											onChange={(event) => onEmailChange(event.target.value)}
											placeholder="you@example.com"
											className="w-full max-w-md px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
										/>
									</div>
									<button
										onClick={onEnable}
										disabled={submitting}
										className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed"
										type="button"
									>
										Enable Let's Encrypt
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
