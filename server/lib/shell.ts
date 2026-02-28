export function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

export function splitShellWords(input: string): string[] {
	const matches = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
	if (!matches) {
		return [];
	}

	return matches.map((token) => {
		if (
			(token.startsWith('"') && token.endsWith('"')) ||
			(token.startsWith("'") && token.endsWith("'"))
		) {
			return token.slice(1, -1);
		}
		return token;
	});
}
