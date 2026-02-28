import type { SSLStatus } from "../../lib/schemas.js";

interface AppSSLProps {
	sslStatus: SSLStatus | null;
	loading: boolean;
	error: string | null;
	email: string;
	submitting: boolean;
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
	onEmailChange,
	onEnable,
	onRenew,
}: AppSSLProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">SSL Certificate</h2>
			</div>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded">
						<div>
							<strong className="text-gray-700">Status:</strong>{" "}
							{sslStatus?.active ? (
								<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
									Active
								</span>
							) : (
								<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
									Inactive
								</span>
							)}
						</div>
						{sslStatus?.certProvider && (
							<div>
								<strong className="text-gray-700">Provider:</strong>{" "}
								<span className="ml-2 text-sm">{sslStatus.certProvider}</span>
							</div>
						)}
					</div>

					{sslStatus?.expiryDate && (
						<div className="flex items-center p-4 bg-gray-50 rounded">
							<strong className="text-gray-700">Expiry Date:</strong>
							<span className="ml-2 text-sm">{sslStatus.expiryDate}</span>
						</div>
					)}

					<div className="pt-4 border-t">
						{sslStatus?.active ? (
							<button
								onClick={onRenew}
								disabled={submitting}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
								type="button"
							>
								Renew Certificate
							</button>
						) : (
							<div className="space-y-3">
								<div>
									<label
										htmlFor="ssl-email"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Let's Encrypt Email
									</label>
									<input
										id="ssl-email"
										type="email"
										value={email}
										onChange={(event) => onEmailChange(event.target.value)}
										placeholder="you@example.com"
										className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<button
									onClick={onEnable}
									disabled={submitting}
									className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
									type="button"
								>
									Enable Let's Encrypt
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
