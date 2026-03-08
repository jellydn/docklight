import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { CommandResult } from "../lib/schemas.js";

interface StreamingActionOptions {
	method?: string;
	body?: string;
	onSuccess?: (result: CommandResult) => void;
	onError?: (result: CommandResult) => void;
}

export function useStreamingAction() {
	const abortRef = useRef<AbortController | null>(null);

	const execute = useCallback(
		async (
			path: string,
			actionLabel: string,
			options?: StreamingActionOptions
		): Promise<CommandResult | null> => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			const toastId = toast.loading(`Starting ${actionLabel}...`);

			try {
				const response = await fetch(`/api${path}`, {
					method: options?.method ?? "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "text/event-stream",
					},
					credentials: "include",
					signal: controller.signal,
					body: options?.body,
				});

				if (response.status === 401) {
					toast.dismiss(toastId);
					window.location.href = "/login";
					return null;
				}

				if (!response.ok || !response.body) {
					let message = `${actionLabel} failed`;
					try {
						const error = await response.json();
						if (error.error) message = error.error;
					} catch {
						// ignore parse error
					}
					toast.error(message, { id: toastId });
					return null;
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				let finalResult: CommandResult | null = null;

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (!line.startsWith("data: ")) continue;
						try {
							const data = JSON.parse(line.slice(6));
							if (data.type === "progress") {
								toast.loading(data.message, { id: toastId });
							} else if (data.type === "output") {
								toast.loading(data.line ?? data.message, { id: toastId });
							} else if (data.type === "result") {
								finalResult = {
									command: data.command,
									exitCode: data.exitCode,
									stdout: data.stdout,
									stderr: data.stderr,
								};
							} else if (data.type === "error") {
								toast.error(data.message, { id: toastId });
							}
						} catch {
							// ignore parse errors
						}
					}
				}

				if (finalResult) {
					if (finalResult.exitCode === 0) {
						toast.success(`${actionLabel} completed`, {
							id: toastId,
							description: `Exit code: ${finalResult.exitCode}`,
						});
						options?.onSuccess?.(finalResult);
					} else {
						toast.error(`${actionLabel} failed`, {
							id: toastId,
							description: finalResult.stderr || `Exit code: ${finalResult.exitCode}`,
						});
						options?.onError?.(finalResult);
					}
				}

				return finalResult;
			} catch (error) {
				if ((error as Error).name === "AbortError") return null;
				toast.error(`${actionLabel} failed`, {
					id: toastId,
					description: error instanceof Error ? error.message : "Unknown error",
				});
				return null;
			}
		},
		[]
	);

	return { execute };
}
