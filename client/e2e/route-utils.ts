import type { Page, Route, Request } from "@playwright/test";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type MockResponseResult = {
	status: number;
	data: unknown;
};

type MockHandler = (request: Request) => MockResponseResult | Promise<MockResponseResult>;

type MockResponse =
	| unknown
	| Partial<Record<HttpMethod, unknown>>
	| MockHandler;

type StatefulHandler<T> = (
	state: T,
	request: Request
) => MockResponseResult | ({ nextState: T } & MockResponseResult);

interface StatefulMock<T> {
	handler: (route: Route) => Promise<void>;
	getState: () => T;
	setState: (state: T) => void;
}

export function fulfillJson(route: Route, data: unknown, status = 200): void {
	route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify(data),
	});
}

export async function mockJsonEndpoint(
	page: Page,
	pattern: string,
	response: MockResponse,
	defaultStatus = 200,
): Promise<void> {
	await page.route(pattern, async (route) => {
		const method = route.request().method() as HttpMethod;

		if (typeof response === "function") {
			const result = await response(route.request());
			fulfillJson(route, result.data, result.status);
			return;
		}

		const methodResponse = response as Partial<Record<HttpMethod, unknown>>;
		if (method in methodResponse) {
			fulfillJson(route, methodResponse[method]!, defaultStatus);
			return;
		}

		fulfillJson(route, response, defaultStatus);
	});
}

export function createStatefulMock<T>(
	initialState: T,
	handler: StatefulHandler<T>,
): StatefulMock<T> {
	let state = initialState;

	return {
		handler: async (route: Route) => {
			const result = handler(state, route.request());

			const resolved = result instanceof Promise ? await result : result;

			if ("nextState" in resolved) {
				state = resolved.nextState as T;
			}

			fulfillJson(route, resolved.data, resolved.status);
		},

		getState: () => state,

		setState: (newState: T) => {
			state = newState;
		},
	};
}

export async function mockMethodRoute(
	page: Page,
	pattern: string,
	method: HttpMethod,
	handler: MockHandler | unknown,
): Promise<void> {
	await page.route(pattern, async (route) => {
		if (route.request().method() === method) {
			const result =
				typeof handler === "function"
					? await (handler as MockHandler)(route.request())
					: { data: handler, status: 200 };
			fulfillJson(route, result.data, result.status);
		} else {
			route.continue();
		}
	});
}
