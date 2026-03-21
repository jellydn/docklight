import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { useAppEvents } from "./use-app-events.js";

const createTestQueryClient = () =>
	new QueryClient({ defaultOptions: { queries: { retry: false } } });

function makeWrapper(queryClient: QueryClient) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	};
}

let lastMockWs: MockWebSocket | null = null;

class MockWebSocket {
	static OPEN = 1;
	readyState = MockWebSocket.OPEN;
	onopen: (() => void) | null = null;
	onmessage: ((event: { data: string }) => void) | null = null;
	onclose: (() => void) | null = null;
	onerror: (() => void) | null = null;
	close = vi.fn(() => {
		this.onclose?.();
	});
	send = vi.fn();

	constructor(_url: string) {
		lastMockWs = this;
	}
}

describe("useAppEvents", () => {
	let queryClient: QueryClient;
	const originalWebSocket = globalThis.WebSocket;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.spyOn(queryClient, "invalidateQueries");
		lastMockWs = null;
		globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
	});

	afterEach(() => {
		globalThis.WebSocket = originalWebSocket;
		vi.clearAllMocks();
	});

	it("should open a WebSocket connection on mount", () => {
		renderHook(() => useAppEvents(), { wrapper: makeWrapper(queryClient) });
		expect(lastMockWs).not.toBeNull();
	});

	it("should invalidate apps.all on app:create event", () => {
		renderHook(() => useAppEvents(), { wrapper: makeWrapper(queryClient) });

		lastMockWs?.onmessage?.({
			data: JSON.stringify({ type: "app:create", appName: "my-app", timestamp: "" }),
		});

		expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: ["apps"] })
		);
	});

	it("should invalidate apps.all on app:destroy event", () => {
		renderHook(() => useAppEvents(), { wrapper: makeWrapper(queryClient) });

		lastMockWs?.onmessage?.({
			data: JSON.stringify({ type: "app:destroy", appName: "my-app", timestamp: "" }),
		});

		expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: ["apps"] })
		);
	});

	it("should invalidate apps.all and apps.detail on app:restart event", () => {
		renderHook(() => useAppEvents(), { wrapper: makeWrapper(queryClient) });

		lastMockWs?.onmessage?.({
			data: JSON.stringify({ type: "app:restart", appName: "my-app", timestamp: "" }),
		});

		expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: ["apps"] })
		);
		expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: ["apps", "my-app"] })
		);
	});

	it("should close WebSocket on unmount", () => {
		const { unmount } = renderHook(() => useAppEvents(), {
			wrapper: makeWrapper(queryClient),
		});

		const ws = lastMockWs;
		unmount();

		expect(ws?.close).toHaveBeenCalled();
	});

	it("should ignore messages with invalid JSON", () => {
		renderHook(() => useAppEvents(), { wrapper: makeWrapper(queryClient) });

		expect(() => {
			lastMockWs?.onmessage?.({ data: "not-json" });
		}).not.toThrow();

		expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
	});

	it("should not invalidate for non-app events", () => {
		renderHook(() => useAppEvents(), { wrapper: makeWrapper(queryClient) });

		lastMockWs?.onmessage?.({
			data: JSON.stringify({ type: "other:event", appName: "my-app", timestamp: "" }),
		});

		expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
	});
});
