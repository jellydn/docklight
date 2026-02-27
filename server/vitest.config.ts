import { defineConfig } from "vitest/config";

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
});
