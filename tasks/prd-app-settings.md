# PRD: Comprehensive App Settings & Enhanced Creation

## Introduction

The current Docklight UI only captures an app name during creation and exposes a limited subset of Dokku configuration (env vars, domains, SSL, scaling). Real-world Dokku applications require port mappings, proxy configuration, buildpack selection, Docker runtime options, network settings, and deployment configuration (deploy branch, monorepo subfolder). This PRD adds a comprehensive **Settings** tab to the App Detail page and enhances the Create App dialog with an expandable "Advanced Options" section, so users can manage the full lifecycle of production Dokku apps from the web UI.

## Goals

- Add a **Settings** tab to the App Detail page with panels for: Ports/Proxy, Buildpacks, Docker Options, Network, and Deployment Settings
- Enhance the Create App dialog with an expandable "Advanced Options" section for optional upfront configuration
- Expose all critical Dokku configuration that is currently CLI-only
- Support monorepo / subfolder deployments via `builder:set build-dir`
- Support custom deploy branch configuration via `git:set deploy-branch`
- Keep the simple "name-only" creation flow as the default, with advanced options opt-in

## User Stories

### US-001: Ports management API endpoints

**Description:** As a developer, I need server endpoints to list, add, and remove port mappings so the frontend can manage how traffic reaches containers.

**Acceptance Criteria:**

- [ ] Add `getPorts(name)` function in a new `server/lib/ports.ts` that runs `dokku ports:report <name>` and parses the port mappings into `{ scheme: string, hostPort: number, containerPort: number }[]`
- [ ] Add `addPort(name, scheme, hostPort, containerPort)` that runs `dokku ports:add <name> <scheme>:<hostPort>:<containerPort>`
- [ ] Add `removePort(name, scheme, hostPort, containerPort)` that runs `dokku ports:remove <name> <scheme>:<hostPort>:<containerPort>`
- [ ] Add `clearPorts(name)` that runs `dokku ports:clear <name>`
- [ ] Add routes: `GET /api/apps/:name/ports`, `POST /api/apps/:name/ports`, `DELETE /api/apps/:name/ports`, `DELETE /api/apps/:name/ports/all`
- [ ] Validate app name and port values (port range 1–65535)
- [ ] Typecheck passes

### US-002: Proxy management API endpoints

**Description:** As a developer, I need server endpoints to view and toggle the proxy configuration for an app.

**Acceptance Criteria:**

- [ ] Add `getProxyReport(name)` function in `server/lib/ports.ts` that runs `dokku proxy:report <name>` and parses enabled status and proxy type
- [ ] Add `enableProxy(name)` that runs `dokku proxy:enable <name>`
- [ ] Add `disableProxy(name)` that runs `dokku proxy:disable <name>`
- [ ] Add routes: `GET /api/apps/:name/proxy`, `POST /api/apps/:name/proxy/enable`, `POST /api/apps/:name/proxy/disable`
- [ ] Typecheck passes

### US-003: Ports & Proxy settings panel on App Detail

**Description:** As a user, I want to view and manage port mappings and proxy settings from the App Detail page so I can control how traffic reaches my app containers.

**Acceptance Criteria:**

- [ ] Add a "Settings" tab to AppDetail (new tab type alongside overview/config/domains/logs/ssl)
- [ ] Within Settings, show a "Ports & Proxy" section
- [ ] Display current port mappings in a table: Scheme | Host Port | Container Port | Actions (remove)
- [ ] "Add Port Mapping" form with scheme dropdown (http/https), host port input, container port input
- [ ] "Clear All Ports" button with confirmation dialog
- [ ] Proxy toggle: show current status (enabled/disabled) with enable/disable button
- [ ] Show proxy type (e.g., nginx) as read-only info
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Buildpacks management API endpoints

**Description:** As a developer, I need server endpoints to list, add, remove, and set buildpacks for an app.

**Acceptance Criteria:**

- [ ] Add `getBuildpacks(name)` function in a new `server/lib/buildpacks.ts` that runs `dokku buildpacks:report <name>` and parses the buildpack list
- [ ] Add `addBuildpack(name, buildpackUrl, index?)` that runs `dokku buildpacks:add <name> <url>` (with optional `--index <n>`)
- [ ] Add `removeBuildpack(name, buildpackUrl)` that runs `dokku buildpacks:remove <name> <url>`
- [ ] Add `setBuildpack(name, buildpackUrl)` that runs `dokku buildpacks:set <name> <url>` (replaces all with one)
- [ ] Add `clearBuildpacks(name)` that runs `dokku buildpacks:clear <name>`
- [ ] Add routes: `GET /api/apps/:name/buildpacks`, `POST /api/apps/:name/buildpacks`, `DELETE /api/apps/:name/buildpacks`, `PUT /api/apps/:name/buildpacks`, `DELETE /api/apps/:name/buildpacks/all`
- [ ] Typecheck passes

### US-005: Buildpacks settings panel on App Detail

**Description:** As a user, I want to manage buildpacks from the App Detail Settings tab so I can control how my app is built without using the CLI.

**Acceptance Criteria:**

- [ ] Within the Settings tab, show a "Buildpacks" section
- [ ] Display current buildpacks as an ordered list with index numbers
- [ ] "Add Buildpack" input with URL field and optional index
- [ ] Remove button next to each buildpack entry
- [ ] "Clear All" button with confirmation dialog
- [ ] Show empty state when no custom buildpacks are set (auto-detected)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Docker Options management API endpoints

**Description:** As a developer, I need server endpoints to manage Docker options (build/deploy/run phase arguments) for an app.

**Acceptance Criteria:**

- [ ] Add `getDockerOptions(name)` function in a new `server/lib/docker-options.ts` that runs `dokku docker-options:report <name>` and parses options grouped by phase (build, deploy, run)
- [ ] Add `addDockerOption(name, phase, option)` that runs `dokku docker-options:add <name> <phase> "<option>"`
- [ ] Add `removeDockerOption(name, phase, option)` that runs `dokku docker-options:remove <name> <phase> "<option>"`
- [ ] Add `clearDockerOptions(name, phase)` that runs `dokku docker-options:clear <name> <phase>`
- [ ] Add routes: `GET /api/apps/:name/docker-options`, `POST /api/apps/:name/docker-options`, `DELETE /api/apps/:name/docker-options`, `DELETE /api/apps/:name/docker-options/all`
- [ ] Validate phase is one of: build, deploy, run
- [ ] Typecheck passes

### US-007: Docker Options settings panel on App Detail

**Description:** As a user, I want to manage Docker runtime options from the Settings tab so I can add volume mounts, memory limits, or other Docker flags without CLI access.

**Acceptance Criteria:**

- [ ] Within the Settings tab, show a "Docker Options" section
- [ ] Display options grouped by phase (Build, Deploy, Run) with collapsible sections
- [ ] Each option shows the full Docker flag with a remove button
- [ ] "Add Option" form with phase dropdown (build/deploy/run) and option text input
- [ ] Include placeholder examples (e.g., `-v /host/path:/container/path`, `--memory 512m`)
- [ ] "Clear Phase" button per phase section with confirmation
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Network configuration API endpoints

**Description:** As a developer, I need server endpoints to view and configure network settings for an app.

**Acceptance Criteria:**

- [ ] Add `getNetworkReport(name)` function in a new `server/lib/network.ts` that runs `dokku network:report <name>` and parses attach-post-create, attach-post-deploy, bind-all-interfaces, initial-network, static-web-listener, tls-internal
- [ ] Add `setNetworkProperty(name, key, value)` that runs `dokku network:set <name> <key> <value>`
- [ ] Add `clearNetworkProperty(name, key)` that runs `dokku network:set <name> <key>` (empty value clears)
- [ ] Add routes: `GET /api/apps/:name/network`, `PUT /api/apps/:name/network`
- [ ] Validate property key is one of the known network properties
- [ ] Typecheck passes

### US-009: Network settings panel on App Detail

**Description:** As a user, I want to view and configure network settings from the Settings tab so I can attach my app to Docker networks or configure listeners.

**Acceptance Criteria:**

- [ ] Within the Settings tab, show a "Network" section
- [ ] Display current network properties as a key-value list with edit capability
- [ ] Properties to show: attach-post-create, attach-post-deploy, bind-all-interfaces, initial-network, static-web-listener, tls-internal
- [ ] Each property shows current value (or "not set") with an edit/clear action
- [ ] Inline editing: click to edit, save/cancel buttons
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Deployment settings API endpoints

**Description:** As a developer, I need server endpoints to manage git deployment settings (deploy branch, build directory for monorepo) for an app.

**Acceptance Criteria:**

- [ ] Add `getDeploymentSettings(name)` function in a new `server/lib/deployment.ts` that runs `dokku git:report <name>` and `dokku builder:report <name>`, parsing deploy-branch, build-dir, and selected builder
- [ ] Add `setDeployBranch(name, branch)` that runs `dokku git:set <name> deploy-branch <branch>`
- [ ] Add `setBuildDir(name, dir)` that runs `dokku builder:set <name> build-dir <dir>` for monorepo/subfolder support
- [ ] Add `clearBuildDir(name)` that runs `dokku builder:set <name> build-dir` (empty clears)
- [ ] Add `setBuilder(name, builder)` that runs `dokku builder:set <name> selected <builder>` (herokuish, dockerfile, pack, null)
- [ ] Add routes: `GET /api/apps/:name/deployment`, `PUT /api/apps/:name/deployment`
- [ ] Typecheck passes

### US-011: Deployment settings panel on App Detail

**Description:** As a user, I want to configure deployment settings from the Settings tab so I can set up monorepo subfolder deploys, custom deploy branches, and builder selection without the CLI.

**Acceptance Criteria:**

- [ ] Within the Settings tab, show a "Deployment" section
- [ ] **Deploy Branch** field: text input showing current branch (default: `main`), save button to update
- [ ] **Build Directory** field: text input for monorepo subfolder path (e.g., `apps/api`, `packages/web`), with clear button
- [ ] Show help text: "Set a subdirectory to deploy from when using a monorepo"
- [ ] **Builder** selector: dropdown with options — Auto-detect, Herokuish, Dockerfile, Cloud Native Buildpacks (pack)
- [ ] Show current values or "default" when not explicitly set
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Enhanced Create App dialog with Advanced Options

**Description:** As a user, I want to optionally configure deployment settings during app creation so I can set up monorepo paths and ports upfront without a second trip to the settings page.

**Acceptance Criteria:**

- [ ] Add a collapsible "Advanced Options" section below the app name input in CreateAppDialog
- [ ] Section is collapsed by default (simple flow unchanged)
- [ ] Advanced Options include:
  - **Deploy Branch**: text input (default empty = uses Dokku default `main`)
  - **Build Directory**: text input with help text "For monorepo: path to subdirectory (e.g., `apps/api`)"
  - **Builder**: dropdown — Auto-detect (default), Herokuish, Dockerfile, Pack
- [ ] On create, call `POST /api/apps` first, then sequentially apply any non-default advanced settings using the respective API endpoints
- [ ] If advanced settings fail, still show app as created but display a warning about which settings failed
- [ ] Existing "name only" flow works identically when advanced section is collapsed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-013: Settings tab structure in AppDetail

**Description:** As a developer, I need to add the Settings tab to AppDetail with a sectioned layout that organizes the 5 settings panels.

**Acceptance Criteria:**

- [ ] Add "settings" to the `TabType` union in AppDetail.tsx
- [ ] Add "Settings" tab button in the tab bar (use a gear/cog icon)
- [ ] Settings tab renders a vertically stacked layout with Card components for each section: Deployment, Ports & Proxy, Buildpacks, Docker Options, Network
- [ ] Each section is independently collapsible (expanded by default)
- [ ] Data for each section fetches lazily when the Settings tab becomes active
- [ ] Follow existing patterns for loading states and error handling
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: `GET /api/apps/:name/ports` returns port mappings as `{ ports: { scheme, hostPort, containerPort }[] }`
- FR-2: `POST /api/apps/:name/ports` adds a port mapping; body: `{ scheme, hostPort, containerPort }`
- FR-3: `DELETE /api/apps/:name/ports` removes a port mapping; body: `{ scheme, hostPort, containerPort }`
- FR-4: `DELETE /api/apps/:name/ports/all` clears all port mappings with confirmation
- FR-5: `GET /api/apps/:name/proxy` returns `{ enabled: boolean, type: string }`
- FR-6: `POST /api/apps/:name/proxy/enable` and `/disable` toggle the proxy
- FR-7: `GET /api/apps/:name/buildpacks` returns `{ buildpacks: { index, url }[] }`
- FR-8: `POST /api/apps/:name/buildpacks` adds a buildpack; body: `{ url, index? }`
- FR-9: `DELETE /api/apps/:name/buildpacks` removes a buildpack; body: `{ url }`
- FR-10: `DELETE /api/apps/:name/buildpacks/all` clears all buildpacks
- FR-11: `GET /api/apps/:name/docker-options` returns `{ build: string[], deploy: string[], run: string[] }`
- FR-12: `POST /api/apps/:name/docker-options` adds an option; body: `{ phase, option }`
- FR-13: `DELETE /api/apps/:name/docker-options` removes an option; body: `{ phase, option }`
- FR-14: `GET /api/apps/:name/network` returns network properties as key-value pairs
- FR-15: `PUT /api/apps/:name/network` sets a network property; body: `{ key, value }`
- FR-16: `GET /api/apps/:name/deployment` returns `{ deployBranch, buildDir, builder }`
- FR-17: `PUT /api/apps/:name/deployment` sets deployment properties; body: `{ deployBranch?, buildDir?, builder? }`
- FR-18: The Create App dialog "Advanced Options" section is collapsed by default
- FR-19: Advanced settings during creation are applied sequentially after `apps:create` succeeds
- FR-20: Port values are validated in range 1–65535
- FR-21: Docker option phases are validated as one of: build, deploy, run
- FR-22: Network property keys are validated against the known set
- FR-23: Builder selection is validated as one of: herokuish, dockerfile, pack, or empty (auto-detect)
- FR-24: All new endpoints clear relevant cache prefixes after mutations
- FR-25: All new endpoints validate app name using existing `isValidAppName()`

## Non-Goals

- No drag-and-drop reordering of buildpacks (use index parameter instead)
- No live preview of port mapping effects
- No Dockerfile editing or viewing from the UI
- No nginx config template customization
- No resource limit presets or templates
- No import/export of app configuration
- No multi-app bulk configuration
- No custom proxy type installation (only toggle existing)

## Design Considerations

- **Settings tab layout**: Use vertically stacked `Card` components, one per section, with section titles and collapse toggles — consistent with existing App Detail patterns
- **Advanced Options in Create dialog**: Use a `Collapsible` component (or simple `details/summary`) with a chevron toggle and "Advanced Options" label
- Reuse existing `Input`, `Button`, `Dialog`, `Card` components throughout
- Port mapping table follows the same pattern as the Config Vars table (key-value with actions)
- Docker Options use a code-style monospace font for option strings
- Network properties use inline editing similar to Config Vars
- Deployment section uses simple form inputs with save/clear buttons
- Follow existing `apiFetch` + Zod schema pattern for all new API calls
- Keep all new settings panels behind the single "Settings" tab to avoid tab overflow

## Technical Considerations

- All Dokku subcommands (`ports:*`, `proxy:*`, `buildpacks:*`, `docker-options:*`, `network:*`, `git:*`, `builder:*`) are covered by the existing `dokku` entry in the allowlist
- Parsing Dokku report output follows existing patterns in `apps.ts` (line-by-line key-value parsing with `stripAnsi`)
- New server modules (`ports.ts`, `buildpacks.ts`, `docker-options.ts`, `network.ts`, `deployment.ts`) each handle one Dokku feature domain
- The Settings tab in AppDetail.tsx could become large; consider extracting each settings section into its own component (e.g., `PortsSettings.tsx`, `BuildpacksSettings.tsx`) to keep the file manageable
- Add Zod schemas in `client/src/lib/schemas.ts` for all new API response shapes
- Cache keys should use consistent prefixes (e.g., `ports:<appName>`, `buildpacks:<appName>`) for targeted invalidation
- The sequential application of advanced settings during creation means partial failure is possible — UI must handle this gracefully

## Success Metrics

- Users can configure port mappings, buildpacks, Docker options, network, and deployment settings entirely from the UI
- Monorepo users can set a build directory in under 3 clicks from the Settings tab
- Advanced Options during creation are used by power users without slowing down the simple creation flow
- Zero increase in page load time for users who don't open the Settings tab (lazy loading)
- All settings are readable and editable without falling back to the CLI

## Open Questions

- ~~Should we add a "Settings Summary" card on the Overview tab showing key non-default settings?~~ **Resolved:** No. Users go to Settings tab when they need it. No duplication.
- ~~Should Docker Options include a predefined list of common options as quick-add buttons?~~ **Resolved:** No. Plain text input is sufficient. Users who set Docker options know what they need.
- ~~Should the builder selection trigger a rebuild prompt when changed?~~ **Resolved:** No. Just save the setting. The user can rebuild manually from the Overview tab when ready.
