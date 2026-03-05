export const queryKeys = {
	apps: {
		all: ["apps"] as const,
		detail: (name: string) => ["apps", name] as const,
		config: (name: string) => ["apps", name, "config"] as const,
		domains: (name: string) => ["apps", name, "domains"] as const,
		ssl: (name: string) => ["apps", name, "ssl"] as const,
		deployment: (name: string) => ["apps", name, "deployment"] as const,
		ports: (name: string) => ["apps", name, "ports"] as const,
		proxy: (name: string) => ["apps", name, "proxy"] as const,
		buildpacks: (name: string) => ["apps", name, "buildpacks"] as const,
		dockerOptions: (name: string) => ["apps", name, "docker-options"] as const,
		network: (name: string) => ["apps", name, "network"] as const,
	},
	users: ["users"] as const,
	plugins: ["plugins"] as const,
	databases: ["databases"] as const,
	health: ["health"] as const,
	commands: ["commands"] as const,
	audit: {
		logs: (filters: object) => ["audit", "logs", filters] as const,
		users: (filters: object) => ["audit", "users", filters] as const,
	},
	auth: {
		me: ["auth", "me"] as const,
	},
	settings: ["settings"] as const,
};
