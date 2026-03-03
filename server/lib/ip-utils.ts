import type http from "node:http";

export function normalizeIP(ip: string): string {
	if (ip.startsWith("::ffff:")) {
		return ip.substring(7);
	}
	return ip;
}

export function isTrustedProxy(ip: string): boolean {
	const normalizedIP = normalizeIP(ip);

	if (
		normalizedIP === "127.0.0.1" ||
		normalizedIP.startsWith("127.") ||
		normalizedIP === "::1" ||
		ip === "::1"
	) {
		return true;
	}

	if (!normalizedIP.includes(".")) {
		return false;
	}

	const dotIndex = normalizedIP.indexOf(".");
	const firstOctet = parseInt(normalizedIP.slice(0, dotIndex), 10);

	if (firstOctet === 10) return true;
	if (firstOctet === 127) return true;

	if (firstOctet === 172 || firstOctet === 192) {
		const secondDotIndex = normalizedIP.indexOf(".", dotIndex + 1);
		if (secondDotIndex === -1) return false;

		const secondOctet = parseInt(normalizedIP.slice(dotIndex + 1, secondDotIndex), 10);

		if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) return true;
		if (firstOctet === 192 && secondOctet === 168) return true;
	}

	return false;
}

export function extractForwardedIP(
	forwardedFor: string | string[] | undefined
): string | undefined {
	if (!forwardedFor) return undefined;

	const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
	if (!value) return undefined;

	const commaIndex = value.indexOf(",");
	const firstIp = commaIndex === -1 ? value.trim() : value.slice(0, commaIndex).trim();

	return firstIp || undefined;
}

export function getClientIP(
	req: http.IncomingMessage,
	trustProxyFn: (ip: string) => boolean = isTrustedProxy
): string | undefined {
	const remoteAddress = req.socket?.remoteAddress;
	if (!remoteAddress) return undefined;

	if (trustProxyFn(remoteAddress)) {
		const forwardedIP = extractForwardedIP(req.headers["x-forwarded-for"]);
		if (forwardedIP) {
			return forwardedIP;
		}
	}

	return normalizeIP(remoteAddress);
}
