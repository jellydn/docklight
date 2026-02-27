export interface CommandResult {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface Toast {
	id: string;
	type: "success" | "error";
	message: string;
	result?: CommandResult;
}
