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
		listener(event);
	}
}
