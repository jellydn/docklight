export const MAX_APP_NAME_LENGTH = 64;

export function isValidAppName(name: string): boolean {
	if (!name || name.length > MAX_APP_NAME_LENGTH || name.length < 1) {
		return false;
	}
	if (name.startsWith("-") || name.endsWith("-")) {
		return false;
	}
	return /^[a-z0-9-]+$/.test(name);
}
