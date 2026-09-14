import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type JSX } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/api.js";
import { queryClient } from "@/lib/query-client.js";
import { queryKeys } from "@/lib/query-keys.js";

const STATUS_SCHEMA = z.object({ enabled: z.boolean() });
const SETUP_SCHEMA = z.object({ secret: z.string(), qrCode: z.string() });
const VERIFY_SCHEMA = z.object({
	enabled: z.literal(true),
	recoveryCodes: z.array(z.string()),
});

interface SetupDetails {
	secret: string;
	qrCode: string;
}

export function Security(): JSX.Element {
	const [setup, setSetup] = useState<SetupDetails | null>(null);
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
	const { addToast } = useToast();
	const { data, isLoading } = useQuery({
		queryKey: queryKeys.auth.twoFactor,
		queryFn: () => apiFetch("/auth/2fa", STATUS_SCHEMA),
	});

	const setupMutation = useMutation({
		mutationFn: () => apiFetch("/auth/2fa/setup", SETUP_SCHEMA, { method: "POST" }),
		onSuccess: setSetup,
		onError: (error: Error) => addToast("error", error.message),
	});

	const verifyMutation = useMutation({
		mutationFn: () =>
			apiFetch("/auth/2fa/verify", VERIFY_SCHEMA, {
				method: "POST",
				body: JSON.stringify({ code }),
			}),
		onSuccess: async (result) => {
			setRecoveryCodes(result.recoveryCodes);
			setSetup(null);
			setCode("");
			await queryClient.invalidateQueries({ queryKey: queryKeys.auth.twoFactor });
			addToast("success", "Two-factor authentication enabled.");
		},
		onError: (error: Error) => addToast("error", error.message),
	});

	const disableMutation = useMutation({
		mutationFn: () =>
			apiFetch("/auth/2fa/disable", STATUS_SCHEMA, {
				method: "POST",
				body: JSON.stringify({ password }),
			}),
		onSuccess: async () => {
			setPassword("");
			setRecoveryCodes([]);
			await queryClient.invalidateQueries({ queryKey: queryKeys.auth.twoFactor });
			addToast("success", "Two-factor authentication disabled.");
		},
		onError: (error: Error) => addToast("error", error.message),
	});

	const verifySetup = (event: FormEvent): void => {
		event.preventDefault();
		verifyMutation.mutate();
	};

	const disable = (event: FormEvent): void => {
		event.preventDefault();
		disableMutation.mutate();
	};

	if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

	return (
		<div className="max-w-2xl">
			<h1 className="text-2xl font-bold mb-2">Security</h1>
			<p className="text-muted-foreground mb-6">
				Protect your account with an authenticator app and recovery codes.
			</p>

			<div className="bg-card rounded-lg border border-border p-6 space-y-5">
				<div>
					<h2 className="text-lg font-semibold">Two-factor authentication</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Status: {data?.enabled ? "Enabled" : "Disabled"}
					</p>
				</div>

				{!data?.enabled && !setup && recoveryCodes.length === 0 && (
					<Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
						Set up authenticator
					</Button>
				)}

				{setup && (
					<div className="space-y-4 border-t border-border pt-5">
						<p className="text-sm">
							Scan this QR code with your authenticator app, then enter its six-digit code.
						</p>
						<img
							src={setup.qrCode}
							alt="Authenticator setup QR code"
							className="h-60 w-60 rounded-md border border-border"
						/>
						<p className="text-xs text-muted-foreground break-all">
							Manual key: <code className="text-foreground">{setup.secret}</code>
						</p>
						<form onSubmit={verifySetup} className="flex flex-col sm:flex-row gap-3">
							<input
								aria-label="Authenticator code"
								inputMode="numeric"
								autoComplete="one-time-code"
								pattern="[0-9]{6}"
								maxLength={6}
								value={code}
								onChange={(event) => setCode(event.target.value)}
								className="px-3 py-2 border border-border rounded-md"
								placeholder="123456"
								required
							/>
							<Button type="submit" disabled={verifyMutation.isPending}>
								Verify and enable
							</Button>
						</form>
					</div>
				)}

				{recoveryCodes.length > 0 && (
					<div className="space-y-3 border-t border-border pt-5">
						<h3 className="font-semibold">Save your recovery codes</h3>
						<p className="text-sm text-muted-foreground">
							Each code works once. Store them outside Docklight. They will not be shown again.
						</p>
						<div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono text-sm">
							{recoveryCodes.map((recoveryCode) => (
								<span key={recoveryCode}>{recoveryCode}</span>
							))}
						</div>
					</div>
				)}

				{data?.enabled && (
					<form onSubmit={disable} className="space-y-3 border-t border-border pt-5">
						<label htmlFor="disable-2fa-password" className="block text-sm font-medium">
							Confirm your password to disable two-factor authentication
						</label>
						<div className="flex flex-col sm:flex-row gap-3">
							<input
								id="disable-2fa-password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="px-3 py-2 border border-border rounded-md flex-1"
								required
							/>
							<Button type="submit" variant="destructive" disabled={disableMutation.isPending}>
								Disable two-factor authentication
							</Button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
