export const DATABASE_PLUGINS = {
	postgres: {
		label: "Postgres",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git",
	},
	redis: {
		label: "Redis",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-redis.git",
	},
	mysql: {
		label: "MySQL",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-mysql.git",
	},
	mariadb: {
		label: "MariaDB",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-mariadb.git",
	},
	mongo: {
		label: "Mongo",
		installCommand: "sudo dokku plugin:install https://github.com/dokku/dokku-mongo.git",
	},
	rabbitmq: {
		label: "RabbitMQ",
		installCommand:
			"sudo dokku plugin:install https://github.com/dokku/dokku-rabbitmq.git --name rabbitmq",
	},
} as const;

export type SupportedPlugin = keyof typeof DATABASE_PLUGINS;

export const SUPPORTED_PLUGINS = Object.keys(DATABASE_PLUGINS) as SupportedPlugin[];

export function getPluginLabel(plugin: SupportedPlugin): string {
	return DATABASE_PLUGINS[plugin].label;
}
