const API_BASE = "/api";

export interface ApiError {
	error: string;
}

export async function apiFetch<T>(
	path: string,
	options?: RequestInit,
): Promise<T> {
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
		window.location.href = "/login";
		throw new Error("Unauthorized");
	}

	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Request failed");
	}

	return response.json();
}
