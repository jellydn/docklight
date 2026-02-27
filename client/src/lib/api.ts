const API_BASE = "/api";

export interface ApiError {
	error: string;
	command?: string;
	exitCode?: number;
	stderr?: string;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const url = `${API_BASE}${path}`;

	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
		credentials: "include",
	});

	if (response.status === 401) {
		if (window.location.pathname !== "/login") {
			window.location.href = "/login";
		}
		throw new Error("Unauthorized");
	}

	if (!response.ok) {
		const error: ApiError = await response.json();
		const details = [error.stderr, error.command].filter(Boolean).join(" | ");
		const message = details ? `${error.error || "Request failed"}: ${details}` : error.error;
		throw new Error(message || "Request failed");
	}

	return response.json();
}
