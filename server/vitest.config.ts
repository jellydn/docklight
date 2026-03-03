import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: [],
		include: ["lib/**/*.test.ts", "routes/**/*.test.ts", "*.test.ts"],
		env: {
			NODE_ENV: "test",
			JWT_SECRET: "test-jwt-secret-for-testing-only",
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["lib/**/*.ts", "*.ts"],
			exclude: ["node_modules/", "dist/", "**/*.test.ts"],
		},
	},
	optimizeDeps: {
		exclude: ["better-sqlite3"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
		},
	},
});
