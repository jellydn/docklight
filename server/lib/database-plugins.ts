export const DATABASE_PLUGINS = {
	postgres: {
		label: "Postgres",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git",
		connectionUrl: (name: string) => `postgresql://${name}@localhost`,
	},
	redis: {
		label: "Redis",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-redis.git",
		connectionUrl: (_name: string) => `redis://localhost:6379`,
	},
	mysql: {
		label: "MySQL",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-mysql.git",
		connectionUrl: (name: string) => `mysql://${name}@localhost`,
	},
	mariadb: {
		label: "MariaDB",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-mariadb.git",
		connectionUrl: (name: string) => `mysql://${name}@localhost`,
	},
	mongo: {
		label: "Mongo",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-mongo.git",
		connectionUrl: (_name: string) => `mongodb://localhost`,
	},
	rabbitmq: {
		label: "RabbitMQ",
		installCommand:
			"sudo dokku plugin:install https://github.com/dokku/dokku-rabbitmq.git --name rabbitmq",
		connectionUrl: (name: string) => `amqp://localhost/${name}`,
	},
} as const;

export type SupportedPlugin = keyof typeof DATABASE_PLUGINS;

export const SUPPORTED_PLUGINS = Object.keys(DATABASE_PLUGINS) as SupportedPlugin[];

export function getConnectionUrl(plugin: SupportedPlugin, dbName: string): string {
	return DATABASE_PLUGINS[plugin].connectionUrl(dbName);
}

export function getInstallCommand(plugin: SupportedPlugin): string {
	return DATABASE_PLUGINS[plugin].installCommand;
}

export function getPluginLabel(plugin: SupportedPlugin): string {
	return DATABASE_PLUGINS[plugin].label;
}
