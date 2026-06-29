# Docklight Testing Patterns

This document details the testing architecture, frameworks, structures, mocking techniques, and strategies for the Docklight project.

---

## 1. Test Setup & Running

Docklight maintains a three-tiered testing structure: **Backend Unit/Integration Tests**, **Frontend Component/Hook Tests**, and **E2E Browser Tests**.

### Key Run Commands
```bash
just test                             # Runs all unit & component tests (both server & client)
cd server && bun run test             # Run server tests once
cd client && bun run test             # Run client tests once
cd server && bun run test:watch       # Run server tests in interactive watch mode
cd client && bun run test:watch       # Run client tests in interactive watch mode
cd client && bun run test:e2e         # Run Playwright E2E tests (builds client first)
cd client && bun run test:e2e:ui      # Run Playwright E2E tests in Playwright UI mode
```

---

## 2. Server Testing (Node.js / Express)

### Framework and Configuration
*   **Engine:** Vitest (configured in `server/vitest.config.ts`).
*   **Environment:** `node`.
*   **Test Globals:** Enabled (`globals: true`).
*   **Mock Environment Variables:** Declared inside the `test` block of `vitest.config.ts`:
    ```typescript
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-jwt-secret-for-testing-only",
    }
    ```

### Mocking Services and Modules
*   Use `vi.mock()` at the top of the test file to isolate modules under test (such as command execution, database, SSH pools, etc.).
*   Mock dependencies explicitly with relative paths:
    ```typescript
    vi.mock("./lib/apps.js", () => ({
      getApps: vi.fn(),
      getAppDetail: vi.fn(),
    }));
    ```
*   In test suites, use `vi.mocked(...)` to perform type-safe overrides on mocked functions:
    ```typescript
    import { getApps } from "./lib/apps.js";

    it("returns list of apps", async () => {
      vi.mocked(getApps).mockResolvedValue([{ name: "app1" }] as never);
      // test execution...
    });
    ```
*   Always call `vi.clearAllMocks()` in a `beforeEach` hook to ensure test isolation.

### HTTP Route / API Testing
*   Use **Supertest** to verify API endpoints by wrapping an Express application instance:
    ```typescript
    import request from "supertest";
    import express from "express";

    describe("GET /api/apps", () => {
      it("should return 200 and list apps", async () => {
        const response = await request(app).get("/api/apps");
        expect(response.status).toBe(200);
      });
    });
    ```
*   Mock authorization middlewares (`authMiddleware`) when testing route handlers, bypass them using mock implementations, or test them separately to isolate route logic from auth details.

### Testing Connection Pools and Timers
*   Use fake timers for classes that handle connection management (e.g., `SSHPool` idle timeouts):
    ```typescript
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("closes connection after idle timeout", async () => {
      await pool.getConnection("dokku@host");
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 5 min timeout + buffer
      expect(mockSshInstance.dispose).toHaveBeenCalled();
    });
    ```

---

## 3. Client Component & Hook Testing (React)

### Framework and Configuration
*   **Engine:** Vitest (configured in `client/vitest.config.ts`).
*   **Environment:** `jsdom`.
*   **Setup File:** `client/src/test/setup.ts` imports `@testing-library/jest-dom` and polyfills missing DOM methods (e.g., `HTMLDialogElement.prototype.showModal` and `close`):
    ```typescript
    import "@testing-library/jest-dom";

    HTMLDialogElement.prototype.showModal ??= function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close ??= function () {
      this.removeAttribute("open");
    };
    ```

### Mocking and Wrappers for React Query
*   Since most components and pages fetch data via React Query, tests must render components inside a test `QueryClientProvider`:
    ```typescript
    import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
    import { render } from "@testing-library/react";

    const createTestQueryClient = () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false } } // Disable retries to fail fast in tests
      });

    const renderWithQueryClient = (ui: React.ReactElement) => {
      const queryClient = createTestQueryClient();
      return render(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      );
    };
    ```

### User Interactions
*   Always use `@testing-library/user-event` (specifically `userEvent.setup()`) for testing click, type, and form interactions, as it mirrors browser behavior better than `fireEvent`:
    ```typescript
    import userEvent from "@testing-library/user-event";

    it("triggers action on click", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<MyComponent />);
      await user.click(screen.getByRole("button", { name: "Submit" }));
      // assertions...
    });
    ```

### Theme CSS Token Assertions
*   Component tests should check for proper application of CSS variables / design tokens rather than hardcoded Tailwind styles (e.g., asserting classes contain `bg-card` instead of `bg-white`).

---

## 4. End-to-End Testing (Playwright)

Docklight uses Playwright for comprehensive page lifecycle testing.

*   **Location:** E2E specs are placed in `client/e2e/` (e.g., `apps.spec.ts`, `login.spec.ts`).
*   **Configuration:** Configured in `client/playwright.config.ts`.
*   **API / Route Mocking:** Playwright E2E tests do not connect to a real Dokku backend. Instead, they use `page.route` to mock backend API responses:
    ```typescript
    await page.route("**/api/apps", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAppsData),
      });
    });
    ```
*   **SSE Streams:** Real-time logging or server processes that stream output via SSE are simulated in Playwright by writing custom mock route handlers that stream chunks of data:
    ```typescript
    // Fulfill Server-Sent Events stream using Playwright route mock helper
    export function fulfillSSE(route: Route, data: Record<string, unknown>) {
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify(data)}\n\n`,
      });
    }
    ```

---

## 5. Coverage Reporting

Docklight uses `@vitest/coverage-v8` to compute coverage statistics.

*   **View Server Coverage:** `cd server && bun run test:coverage`
*   **View Client Coverage:** `cd client && bun run test:coverage`
*   **Configured Scope:** Code coverage is collected for all active library and route TS files while excluding tests, Node modules, and build output targets (`dist/`).
