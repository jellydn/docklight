# PRD: App Management (Create, Destroy, Stop/Start)

## Introduction

Add full app lifecycle management to the Docklight web UI. Currently, apps can only be created and destroyed via the Dokku CLI. This feature brings create, destroy, stop, and start actions into the web interface — similar to Heroku's dashboard — so users can manage their entire app lifecycle without touching the terminal.

After creating an app, users see a "next steps" dialog with the git remote URL and deployment instructions, bridging the gap between app creation and first deployment.

## Goals

- Allow creating new Dokku apps from the web UI
- Allow destroying apps with a safe confirmation flow
- Add stop/start controls alongside existing restart/rebuild
- Provide a dedicated Apps listing page with a "Create App" button
- Add a "Create App" button to the Dashboard apps section
- Show post-creation guidance with git remote and deploy instructions

## User Stories

### US-001: Create App API endpoint

**Description:** As a developer, I need a server endpoint to create Dokku apps so the frontend can trigger app creation.

**Acceptance Criteria:**

- [ ] Add `createApp(name)` function in `server/lib/apps.ts` that runs `dokku apps:create <name>`
- [ ] Validate app name with existing `isValidAppName()` (lowercase, numbers, hyphens only)
- [ ] Add `POST /api/apps` route in `server/index.ts` that accepts `{ name: string }`
- [ ] Return `{ success: true, name }` on success, or error with stderr on failure
- [ ] Clear apps cache (`clearPrefix("apps:")`) after creation
- [ ] Typecheck passes

### US-002: Destroy App API endpoint

**Description:** As a developer, I need a server endpoint to destroy Dokku apps with safety validation.

**Acceptance Criteria:**

- [ ] Add `destroyApp(name, confirmName)` function in `server/lib/apps.ts` that runs `dokku apps:destroy <name> --force`
- [ ] Validate that `confirmName` matches `name` before executing
- [ ] Add `DELETE /api/apps/:name` route in `server/index.ts` that accepts `{ confirmName: string }`
- [ ] Return `{ success: true }` on success, or error with stderr on failure
- [ ] Clear apps cache after destruction
- [ ] Typecheck passes

### US-003: Stop and Start App API endpoints

**Description:** As a developer, I need server endpoints to stop and start Dokku apps.

**Acceptance Criteria:**

- [ ] Add `stopApp(name)` function in `server/lib/apps.ts` that runs `dokku ps:stop <name>`
- [ ] Add `startApp(name)` function in `server/lib/apps.ts` that runs `dokku ps:start <name>`
- [ ] Add `POST /api/apps/:name/stop` route in `server/index.ts`
- [ ] Add `POST /api/apps/:name/start` route in `server/index.ts`
- [ ] Clear apps cache after each action
- [ ] Typecheck passes

### US-004: Create App dialog on Dashboard

**Description:** As a user, I want to create a new app from the Dashboard so I can quickly spin up apps without leaving the main page.

**Acceptance Criteria:**

- [ ] Add "Create App" button next to the "Apps" section header on Dashboard
- [ ] Clicking opens a dialog (using existing Radix `Dialog` component) with an app name input
- [ ] Input validates: lowercase letters, numbers, and hyphens only (matches `isValidAppName`)
- [ ] Show inline validation error if name is invalid
- [ ] "Create" button calls `POST /api/apps` and shows loading state
- [ ] On error, show error message in the dialog
- [ ] On success, show "Next Steps" content (see US-006)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Dedicated Apps listing page

**Description:** As a user, I want a proper Apps page at `/apps` that lists all my apps and lets me create new ones, instead of redirecting to Dashboard.

**Acceptance Criteria:**

- [ ] Replace the `Navigate` redirect in `Apps.tsx` with a full apps listing page
- [ ] Show a table of apps with Name, Status, Domains, and Last Deploy columns (same as Dashboard)
- [ ] Add "Create App" button in the page header
- [ ] Clicking "Create App" opens the same create dialog (reuse component from US-004)
- [ ] App names link to `/apps/:name` detail page
- [ ] Empty state: show friendly message with "Create App" call-to-action
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Next Steps dialog after app creation

**Description:** As a user, after creating an app I want to see deployment instructions so I know how to push my code.

**Acceptance Criteria:**

- [ ] After successful creation, dialog content changes to "Next Steps" view
- [ ] Show the git remote URL: `dokku@<server>:<app-name>`
- [ ] Show step-by-step instructions:
  1. `git remote add dokku dokku@<server>:<app-name>`
  2. `git push dokku main`
- [ ] Include a "Copy" button next to the git remote command
- [ ] Include a "Go to App" button that navigates to `/apps/<name>`
- [ ] Include a "Close" button to dismiss and stay on the current page
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Destroy App from App Detail page

**Description:** As a user, I want to destroy an app from its detail page with a safe confirmation flow, similar to Heroku's destructive action pattern.

**Acceptance Criteria:**

- [ ] Add a "Danger Zone" section at the bottom of the App Detail page
- [ ] "Delete App" button opens a confirmation dialog
- [ ] Dialog requires typing the app name to confirm (must match exactly)
- [ ] "Delete" button is disabled until the typed name matches
- [ ] On success, navigate to `/apps` and show success toast
- [ ] On error, show error message in the dialog
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Stop/Start controls on App Detail page

**Description:** As a user, I want to stop and start my app from the detail page alongside the existing restart/rebuild controls.

**Acceptance Criteria:**

- [ ] Add "Stop" button visible when app status is `running`
- [ ] Add "Start" button visible when app status is `stopped`
- [ ] "Stop" button opens a confirmation dialog before executing
- [ ] Buttons call `POST /api/apps/:name/stop` or `/start` respectively
- [ ] Show loading state during the action
- [ ] Refresh app detail after action completes
- [ ] Show success/error toast notification
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: `POST /api/apps` creates a new Dokku app via `dokku apps:create <name>`
- FR-2: `DELETE /api/apps/:name` destroys a Dokku app via `dokku apps:destroy <name> --force`, requiring `confirmName` in the request body to match the app name
- FR-3: `POST /api/apps/:name/stop` stops the app via `dokku ps:stop <name>`
- FR-4: `POST /api/apps/:name/start` starts the app via `dokku ps:start <name>`
- FR-5: App name validation enforces Dokku rules: lowercase letters, numbers, and hyphens only (`/^[a-z0-9-]+$/`)
- FR-6: All mutating endpoints clear the apps cache after execution
- FR-7: The "Create App" dialog is accessible from both Dashboard and Apps pages
- FR-8: The "Next Steps" dialog shows the git remote URL using the server's hostname
- FR-9: Destroy confirmation requires typing the exact app name before the delete button enables
- FR-10: Stop/Start buttons show conditionally based on current app status

## Non-Goals

- No GitHub/GitLab integration for automatic deployments
- No buildpack selection during app creation
- No app cloning or forking
- No bulk app operations (multi-select destroy, etc.)
- No app name conflict checking before submission (Dokku CLI handles this and returns an error)
- No app transfer or ownership management

## Design Considerations

- Reuse existing `Dialog`, `Button`, `Input`, and `Card` UI components
- Follow existing patterns in `Dashboard.tsx` for data fetching and state management
- The "Create App" dialog component should be extracted as a shared component used by both Dashboard and Apps pages
- Danger Zone section styling: red border, warning text, similar to GitHub/Heroku settings pages
- Use `apiFetch` from `lib/api.ts` for API calls
- Use existing toast system (`ToastProvider`) for success/error notifications

## Technical Considerations

- The `dokku apps:create` command is already in the allowed commands since `dokku` is in the allowlist (`server/lib/allowlist.ts`)
- Server hostname for git remote can be derived from `req.hostname` or an environment variable
- The `executeCommand` function in `server/lib/executor.ts` handles both local and SSH execution
- Add Zod schemas in `client/src/lib/schemas.ts` for the new API responses
- The create dialog state machine: `idle → creating → success (next steps) | error`

## Success Metrics

- Users can create a new app in under 3 clicks from Dashboard or Apps page
- Users can destroy an app safely with typed confirmation
- Stop/Start actions respond within 10 seconds
- Post-creation "Next Steps" provides all info needed for first deployment

## Open Questions

- ~~Should the server hostname for the git remote come from an env variable (e.g., `DOKKU_HOST`) or be derived from the request?~~ **Resolved:** Derive from the request (`req.hostname`) — keep it simple.
- ~~Should we add a "Stop App" confirmation dialog, or is a single click sufficient since it's non-destructive?~~ **Resolved:** Yes, add a confirmation dialog for stop.
