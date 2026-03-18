import { describe, it, expect, vi, beforeEach } from "vitest";

// Import the module fresh each time via dynamic import to reset state
// We use vi.isolateModules for tests that need isolated state

describe("app-events", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("should call listener when broadcastAppEvent is called", async () => {
		const { subscribeToAppEvents, broadcastAppEvent } = await import("./app-events.js");

		const listener = vi.fn();
		const unsubscribe = subscribeToAppEvents(listener);

		const event = { type: "app:restart", appName: "my-app", timestamp: "2024-01-01T00:00:00.000Z" };
		broadcastAppEvent(event);

		expect(listener).toHaveBeenCalledWith(event);
		unsubscribe();
	});

	it("should not call listener after unsubscribe", async () => {
		const { subscribeToAppEvents, broadcastAppEvent } = await import("./app-events.js");

		const listener = vi.fn();
		const unsubscribe = subscribeToAppEvents(listener);
		unsubscribe();

		broadcastAppEvent({ type: "app:stop", appName: "my-app", timestamp: "2024-01-01T00:00:00.000Z" });

		expect(listener).not.toHaveBeenCalled();
	});

	it("should call multiple listeners", async () => {
		const { subscribeToAppEvents, broadcastAppEvent } = await import("./app-events.js");

		const listener1 = vi.fn();
		const listener2 = vi.fn();
		const unsub1 = subscribeToAppEvents(listener1);
		const unsub2 = subscribeToAppEvents(listener2);

		const event = { type: "app:start", appName: "my-app", timestamp: "2024-01-01T00:00:00.000Z" };
		broadcastAppEvent(event);

		expect(listener1).toHaveBeenCalledWith(event);
		expect(listener2).toHaveBeenCalledWith(event);

		unsub1();
		unsub2();
	});

	it("should only remove the unsubscribed listener", async () => {
		const { subscribeToAppEvents, broadcastAppEvent } = await import("./app-events.js");

		const listener1 = vi.fn();
		const listener2 = vi.fn();
		const unsub1 = subscribeToAppEvents(listener1);
		subscribeToAppEvents(listener2);

		unsub1();

		broadcastAppEvent({ type: "app:scale", appName: "my-app", timestamp: "2024-01-01T00:00:00.000Z" });

		expect(listener1).not.toHaveBeenCalled();
		expect(listener2).toHaveBeenCalled();
	});
});
