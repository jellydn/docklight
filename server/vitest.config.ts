import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["lib/**/*.test.ts", "*.test.ts"],
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
