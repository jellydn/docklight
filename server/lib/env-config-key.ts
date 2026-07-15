const CONFIG_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateConfigKey(key: string): string | null {
	if (typeof key !== "string" || key.length === 0) {
		return "Config key is required";
	}
	if (!CONFIG_KEY_PATTERN.test(key)) {
		return "Invalid characters in key";
	}
	return null;
}

export function assertValidConfigKey(key: string): void {
	const error = validateConfigKey(key);
	if (error) {
		throw new Error(error);
	}
}