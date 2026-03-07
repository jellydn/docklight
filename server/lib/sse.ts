import type { Response } from "express";
import type { CommandResult } from "./executor.js";

export interface SSEWriter {
	sendProgress(message: string): void;
	sendOutput(line: string, isError?: boolean): void;
	sendResult(result: CommandResult): void;
	sendError(message: string): void;
	close(): void;
}

export function createSSEWriter(res: Response): SSEWriter {
	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	function send(data: Record<string, unknown>): void {
		res.write(`data: ${JSON.stringify(data)}\n\n`);
	}

	return {
		sendProgress(message: string) {
			send({ type: "progress", message });
		},
		sendOutput(line: string, isError = false) {
			send({ type: "output", line, error: isError });
		},
		sendResult(result: CommandResult) {
			send({ type: "result", ...result });
		},
		sendError(message: string) {
			send({ type: "error", message });
		},
		close() {
			res.end();
		},
	};
}

export function isSSERequest(req: { headers: { accept?: string } }): boolean {
	return req.headers.accept === "text/event-stream";
}
