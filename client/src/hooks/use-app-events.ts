import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;

export function useAppEvents() {
	const queryClient = useQueryClient();

	useEffect(() => {
		let ws: WebSocket | null = null;
		let reconnectDelay = RECONNECT_DELAY_MS;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let stopped = false;

		const connect = () => {
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const url = `${protocol}//${window.location.host}/api/events/stream`;
			ws = new WebSocket(url);

			ws.onopen = () => {
				reconnectDelay = RECONNECT_DELAY_MS;
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data as string) as { type?: string; appName?: string };
					const { type, appName } = data;

					if (!type?.startsWith("app:")) return;

					if (type === "app:create" || type === "app:destroy") {
						void queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
					} else if (!appName) {
						return;
					} else {
						void queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
						void queryClient.invalidateQueries({ queryKey: queryKeys.apps.detail(appName) });
					}
				} catch {
					// ignore parse errors
				}
			};

			ws.onclose = () => {
				if (!stopped) {
					reconnectTimer = setTimeout(() => {
						reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
						connect();
					}, reconnectDelay);
				}
			};

			ws.onerror = () => {
				ws?.close();
			};
		};

		connect();

		return () => {
			stopped = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			ws?.close();
		};
	}, [queryClient]);
}
