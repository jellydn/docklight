const DEFAULT_SSH_PORT = 22;

export interface ParsedSshTarget {
	host: string;
	username: string;
	port: number;
}

function isValidPort(port: number): boolean {
	return Number.isInteger(port) && port > 0 && port <= 65535;
}

export function parseSshTarget(target: string): ParsedSshTarget | null {
	const input = target.trim();

	if (input.startsWith("ssh://")) {
		try {
			const url = new URL(input);
			const username = url.username;
			const hostname = url.hostname;
			const host = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
			const port = url.port ? Number(url.port) : DEFAULT_SSH_PORT;
			if (!host || !username) return null;
			if (url.port && !isValidPort(port)) return null;
			return { host, username, port };
		} catch {
			return null;
		}
	}

	const atIndex = input.indexOf("@");
	if (atIndex <= 0) return null;
	const username = input.slice(0, atIndex);
	const hostPart = input.slice(atIndex + 1);
	if (!hostPart) return null;

	if (hostPart.startsWith("[")) {
		const closeBracket = hostPart.indexOf("]");
		if (closeBracket === -1) return null;
		const host = hostPart.slice(1, closeBracket);
		if (!host) return null;
		const afterBracket = hostPart.slice(closeBracket + 1);
		if (afterBracket === "") {
			return { host, username, port: DEFAULT_SSH_PORT };
		}
		if (afterBracket.startsWith(":")) {
			const parsedPort = Number(afterBracket.slice(1));
			if (isValidPort(parsedPort)) {
				return { host, username, port: parsedPort };
			}
		}
		return null;
	}

	const colons = hostPart.split(":").length - 1;
	if (colons > 1) {
		return { host: hostPart, username, port: DEFAULT_SSH_PORT };
	}

	const colonIndex = hostPart.indexOf(":");
	if (colonIndex >= 0) {
		const host = hostPart.slice(0, colonIndex);
		if (!host) return null;
		const parsedPort = Number(hostPart.slice(colonIndex + 1));
		if (isValidPort(parsedPort)) {
			return {
				host,
				username,
				port: parsedPort,
			};
		}
		return null;
	}
	return { host: hostPart, username, port: DEFAULT_SSH_PORT };
}
