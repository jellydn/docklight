import { logger } from "./logger.js";

export interface AppEvent {
	type: string;
	appName: string;
	timestamp: string;
}

type EventListener = (event: AppEvent) => void;

const listeners = new Set<EventListener>();

export function subscribeToAppEvents(listener: EventListener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function broadcastAppEvent(event: AppEvent): void {
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (err) {
			logger.error({ err, eventType: event.type, appName: event.appName }, "Error in app event listener");
		}
	}
}
