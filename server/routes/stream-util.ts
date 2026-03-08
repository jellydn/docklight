import type express from "express";
import { clearPrefix } from "../lib/cache.js";
import { executeCommandStreaming } from "../lib/executor.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import { safeAuditLog } from "./util.js";

export interface StreamActionOptions {
	dokkuCommand: string;
	auditAction: string;
	appName: string;
	auditDetails?: Record<string, unknown>;
	timeout?: number;
	cachePrefix?: string;
}

async function streamAction(
	req: express.Request,
	res: express.Response,
	options: StreamActionOptions
): Promise<void> {
	const {
		dokkuCommand,
		auditAction,
		appName,
		auditDetails,
		timeout = 60000,
		cachePrefix = "apps:",
	} = options;
	const sse = createSSEWriter(res);

	try {
		const result = await executeCommandStreaming(
			dokkuCommand,
			(event) => {
				if (event.type === "progress") {
					sse.sendProgress(event.message);
				} else {
					sse.sendOutput(event.message, event.error);
				}
			},
			timeout
		);

		if (result.exitCode === 0) {
			safeAuditLog(req, auditAction, appName, auditDetails ?? null);
			clearPrefix(cachePrefix);
		}
		sse.sendResult(result);
	} catch (err) {
		sse.sendError(err instanceof Error ? err.message : "Unknown error");
	} finally {
		sse.close();
	}
}

export interface ValidateAndStreamOptions {
	req: express.Request;
	res: express.Response;
	dokkuCommand: string;
	auditAction: string;
	appName: string;
	validate: () => boolean;
	errorMessage: string;
	auditDetails?: Record<string, unknown>;
	timeout?: number;
}

export async function validateAndStream(options: ValidateAndStreamOptions): Promise<void> {
	const {
		req,
		res,
		dokkuCommand,
		auditAction,
		appName,
		validate,
		errorMessage,
		auditDetails,
		timeout,
	} = options;

	if (isSSERequest(req)) {
		if (!validate()) {
			res.status(400).json({ error: errorMessage });
			return;
		}
		await streamAction(req, res, {
			dokkuCommand,
			auditAction,
			appName,
			auditDetails,
			timeout,
		});
		return;
	}

	throw new Error("validateAndStream called without SSE request");
}

export { streamAction };
