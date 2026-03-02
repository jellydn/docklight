# E2E Testing Setup

This PR adds end-to-end test coverage using Playwright for critical user flows.

## What's Added

### Test Files
- `client/e2e/auth.spec.ts` - Login/logout flow tests
- `client/e2e/app-lifecycle.spec.ts` - App creation, restart, stop, delete tests
- `client/e2e/config-management.spec.ts` - Environment variable management tests

### Configuration
- `client/playwright.config.ts` - Playwright configuration
- `.github/workflows/e2e.yml` - CI pipeline for E2E tests
- `client/package.json` - Added `test:e2e` script

## Running Tests

```bash
cd client
npm install
npx playwright install chromium
npm run test:e2e
```

## CI Integration

E2E tests run automatically on push/PR to main branch. Test reports are uploaded as artifacts.

## Coverage

- ✅ Login flow (valid/invalid credentials, logout)
- ✅ App lifecycle (create, restart, stop, delete)
- ✅ Config management (set/unset env vars)

## Notes

Tests use role-based selectors for better maintainability. Adjust selectors based on actual UI implementation.
