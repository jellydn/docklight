import * as readline from "readline";
import { createUser, getUserByUsername, updateUser } from "./lib/db.js";
import { hashPassword } from "./lib/auth.js";

const username = process.argv[2];

if (!username) {
	console.error("Usage: node createUser.js <username> [password]");
	process.exit(1);
}

const passwordFromArg = process.argv[3] || process.env.DOCKLIGHT_DEFAULT_PASSWORD;

function prompt(question: string, hidden = false): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		if (hidden) {
			process.stdout.write(question);
			const stdin = process.stdin;
			const wasRaw = stdin.isRaw;
			if (stdin.setRawMode) stdin.setRawMode(true);
			let input = "";
			const onData = (ch: Buffer) => {
				const c = ch.toString("utf8");
				if (c === "\n" || c === "\r") {
					if (stdin.setRawMode) stdin.setRawMode(wasRaw ?? false);
					stdin.removeListener("data", onData);
					process.stdout.write("\n");
					rl.close();
					resolve(input);
				} else if (c === "\u0003") {
					process.exit(1);
				} else if (c === "\u007F" || c === "\b") {
					input = input.slice(0, -1);
				} else {
					input += c;
				}
			};
			stdin.on("data", onData);
		} else {
			rl.question(question, (answer) => {
				rl.close();
				resolve(answer);
			});
		}
	});
}

async function main() {
	let password = passwordFromArg;
	if (!password) {
		password = await prompt("Password: ", true);
	}
	if (!password || password.length === 0) {
		console.error("Password cannot be empty.");
		process.exit(1);
	}

	if (!passwordFromArg) {
		const confirm = await prompt("Confirm password: ", true);
		if (password !== confirm) {
			console.error("Passwords do not match.");
			process.exit(1);
		}
	}

	const passwordHash = await hashPassword(password);
	const existing = getUserByUsername(username);

	if (existing) {
		updateUser(existing.id, { passwordHash });
		console.log(`Password updated for user "${username}".`);
	} else {
		createUser(username, passwordHash, "admin");
		console.log(`Admin user "${username}" created.`);
	}
}

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
