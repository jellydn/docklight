import { executeCommand, CommandResult } from './executor.js';
import { isValidAppName } from './apps.js';

export async function getConfig(
	name: string,
): Promise<Record<string, string> | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: 'Invalid app name',
			command: '',
			exitCode: 400,
			stderr: 'App name must contain only lowercase letters, numbers, and hyphens',
		};
	}

	try {
		const result = await executeCommand(`dokku config:show ${name}`);
		
		if (result.exitCode !== 0) {
			return {
				error: 'Failed to get config',
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const config: Record<string, string> = {};
		const lines = result.stdout.split('\n').filter(line => line.trim());
		
		for (const line of lines) {
			const match = line.match(/^(\w+):\s*(.+)$/);
			if (match) {
				config[match[1]] = match[2];
			}
		}

		return config;
	} catch (error: any) {
		return {
			error: error.message || 'Unknown error occurred',
			command: `dokku config:show ${name}`,
			exitCode: 1,
			stderr: error.message || '',
		};
	}
}

export async function setConfig(
	name: string,
	key: string,
	value: string,
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: 'Invalid app name',
			command: '',
			exitCode: 400,
		};
	}

	// Sanitize inputs to prevent shell injection
	const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
	const sanitizedValue = value.replace(/['"`$()|<>\\]/g, '');

	if (sanitizedKey !== key || sanitizedValue !== value) {
		return {
			error: 'Invalid characters in key or value',
			command: '',
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku config:set ${name} ${sanitizedKey}=${sanitizedValue}`);
	} catch (error: any) {
		return {
			error: error.message || 'Unknown error occurred',
			command: `dokku config:set ${name} ${sanitizedKey}=${sanitizedValue}`,
			exitCode: 1,
		};
	}
}

export async function unsetConfig(
	name: string,
	key: string,
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: 'Invalid app name',
			command: '',
			exitCode: 400,
		};
	}

	// Sanitize key to prevent shell injection
	const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');

	if (sanitizedKey !== key) {
		return {
			error: 'Invalid characters in key',
			command: '',
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku config:unset ${name} ${sanitizedKey}`);
	} catch (error: any) {
		return {
			error: error.message || 'Unknown error occurred',
			command: `dokku config:unset ${name} ${sanitizedKey}`,
			exitCode: 1,
		};
	}
}
