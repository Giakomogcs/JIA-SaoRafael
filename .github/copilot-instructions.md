# DynamicFront — Copilot Instructions

DynamicFront is an agentic platform that generates Next.js UIs from OpenAPI documentation and spreadsheets (Excel, CSV, Google Sheets). Users upload API specs or spreadsheet files, configure an LLM provider, and chat with an AI coding agent (OpenCode) that writes code directly into a live Next.js project running in a sandboxed Docker container.

---

## Project Layout

Two independent npm workspaces — no root-level scripts. Always `cd` into the correct workspace before running commands.

| Dir        | Stack                                                 | Port |
| ---------- | ----------------------------------------------------- | ---- |
| `backend/` | NestJS 11, TypeScript, Prisma + PostgreSQL, Socket.IO | 3001 |
| `client/`  | Next.js 16+, React 19, Tailwind CSS v4, Zustand       | 3000 |

Additional packages:

| Dir                                  | Purpose                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `backend/packages/dynamicfront-sdk/` | `@dynamicfront/sdk` — React component library for generated projects                                                    |
| `backend/src/skills/`                | MCP Skills Engine — ~75 tools exposed via JSON-RPC (incl. 11 feature installers + 3 Design Arsenal + strategy resolver) |
| `backend/src/design-arsenal/`        | Curated design reference library (godly, 21st.dev, motionsites, spline)                                                 |
| `backend/src/data-sources/`          | Data Sources — spreadsheet parsing, connectors, writeback, API generation                                               |

Copilot Skills (`.github/skills/`):

| Dir                              | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `.github/skills/tech-doc-skill/` | Generates project documentation (README.md + ARCHITECTURE.md) |
| `.github/skills/skill-creator/`  | Creates, evaluates, benchmarks, and improves Copilot skills   |

Generated Next.js workspaces live in `workspaces/<name-slug>-<workspaceId>/` (bind-mounted into sandbox containers).

---

## Commands

### Backend (`cd backend`)

```bash
npm run start:dev       # NestJS watch mode
npm run build           # nest build → dist/
npm run lint            # ESLint --fix
npm run format          # Prettier --write

# Tests
npm test                # Jest unit tests (*.spec.ts in src/)
npm run test:watch      # Jest watch mode
npm run test:cov        # Jest with coverage
npm run test:e2e        # Jest e2e tests (*.e2e-spec.ts in test/)

# Run a single test file or pattern
npm test -- --testPathPattern=workspaces
npm test -- --testPathPattern=src/chat/agent-orchestrator.service.spec.ts
npm test -- --testNamePattern="creates session"
npm run test:e2e -- --testPathPattern=auth

# Database
npx prisma migrate dev  # apply migrations
npx prisma studio       # visual DB browser
```

Swagger UI: `http://localhost:3001/swagger`

### Frontend (`cd client`)

```bash
npm run dev    # Next.js dev server (port 3000)
npm run build  # production build
npm run lint   # ESLint
```

_(No test suite in the client.)_

### SDK (`cd backend/packages/dynamicfront-sdk`)

```bash
npm run build    # tsc
npm run dev      # tsc --watch
```

---

## Architecture

### Data model (PostgreSQL via Prisma)

```
User
 ├── OpencodeInstance (1:1)         — OpenCode Docker container per user
 ├── ProviderConfig (1:N)           — LLM provider config per user
 ├── DataSource (1:N)               — uploaded spreadsheets + parsed data
 │    ├── DataSourceSheet (1:N)      — individual sheets with columns/data
 │    ├── DataSourceRelation (1:N)   — detected FKs and join tables
 │    ├── DataSourceComputedField (1:N) — translated formulas
 │    ├── DataSourceMacro (1:N)      — VBA → TypeScript translations
 │    └── DataSourceChangeEvent (1:N) — write-back change events
 └── Workspace (1:N)
      ├── ApiDoc (N:N via WorkspaceApiDoc) — OpenAPI specs + LLM summaries
      ├── DataSource (N:N via WorkspaceDataSource) — linked data sources
      ├── CrossDataSourceRelation (1:N) — relations between data sources
      ├── WorkspaceUnifiedSchema (1:1) — merged schema from N data sources
      ├── Project (1:1)             — path to the generated Next.js dir on disk
      ├── SandboxInstance (1:1)     — sandbox Docker container per project
      ├── WorkspacePreferences (1:1) — user preferences + design tokens + discovery phase
      └── WorkspaceChatSession (1:N) — chat sessions (workspace ↔ OpenCode)
           └── ChatMessage (1:N)

AgentSession                        — multi-task orchestrator
 ├── AgentTask (1:N)
 ├── AgentArtifact (1:N)
 └── AgentApproval (1:N)
```

### Request flow (chat message → code change)

1. **Frontend** sends a Socket.IO `chat:message` event to the `/chat` namespace.
2. **`ChatGateway`** receives it and calls **`ChatService.chatWithProgress()`**.
3. `ChatService` resolves the workspace → project directory path.
4. **`OpencodeService.getClientForWorkspace()`** returns an HTTP client scoped with `x-opencode-directory` pointing to the project dir.
5. On the first message, `ChatContextService` injects API docs + `CRITICAL_IMPLEMENTATION_RULES` into OpenCode.
6. **OpenCode** (one Docker container per user, ports 5000–5999) streams SSE events back; forwarded to the frontend as `chat:token`, `chat:tool`, `chat:done`.
7. OpenCode calls **MCP Skills** at `POST /mcp/skills` (JSON-RPC).
8. Skills generate code; OpenCode writes files into `workspaces/<slug>-<workspaceId>/`.

### SDK (`@dynamicfront/sdk`)

React component library at `backend/packages/dynamicfront-sdk/`. Mounted read-only in Docker containers. Modules:

| Module        | Components                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/`       | AuthProvider, LoginForm, createAuthMiddleware, useAuth                                                                                                                      |
| `api/`        | createApiClient, useApiQuery, useApiMutation                                                                                                                                |
| `ui/`         | Button, Card, Badge, Input, Textarea, Label, Checkbox, RadioGroup, Switch, Modal, Table, Select, Avatar, Tabs, Tooltip, Separator, DropdownMenu, ThemeProvider, ThemeToggle |
| `data/`       | DataTable, FormBuilder, DetailView, EmptyState, LoadingSkeleton                                                                                                             |
| `dashboard/`  | KPICard, ChartCard, DashboardGrid                                                                                                                                           |
| `navigation/` | Sidebar, Header, Breadcrumbs, TabNavigation                                                                                                                                 |

### MCP Skills (~80 tools exposed)

Endpoint: `POST /mcp/skills` (`@Public`, JSON-RPC)

| Skill                           | Purpose                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data_source_strategy_resolver` | Deterministic planner — returns auth strategy + resource source map + `recommendedOrder` + `patternSuggestions[]` (geo→map, money→insight, FK→master-detail, etc.). CALL FIRST on any new workspace.                                 |
| `auto_scaffold_from_strategy`   | **Auto-pilot.** Runs the resolver and executes EVERY entry in `recommendedOrder` + every `patternSuggestions[]` deterministically in one call. No LLM ping-pong. Designed for low-tier models on "build the whole project" requests. |
| `analyze_api`                   | Analyze OpenAPI specs                                                                                                                                                                                                                |
| `analyze_spreadsheet`           | Analyze uploaded spreadsheets, prints PRIMARY METRIC fingerprint (gross vs net) and recommended primary date column                                                                                                                  |
| `check_existing_code`           | Verify existing files/routes before scaffolding (READ-BEFORE-WRITE)                                                                                                                                                                  |
| `smart_route_plan`              | Plan Next.js App Router routes from API structure                                                                                                                                                                                    |
| `scaffold_auth`                 | Complete auth scaffold (middleware, AuthProvider, login)                                                                                                                                                                             |
| `scaffold_dashboard`            | Dashboard layout + data tables for CRUD resources                                                                                                                                                                                    |
| `scaffold_crud`                 | Full CRUD for a single resource                                                                                                                                                                                                      |
| `scaffold_navigation`           | Navigation: sidebar, tabs, or header + layout                                                                                                                                                                                        |
| `scaffold_page`                 | Single page: list, detail, form, settings, landing                                                                                                                                                                                   |
| `pattern_dashboard_mixed`       | KPI cards + charts + data table on one page                                                                                                                                                                                          |
| `pattern_insight_dashboard`     | Period-aware cross-domain insight panel (conversion, top categories, overdue/upcoming, concentration). Accepts `dateFrom`/`dateTo`/`refreshKey`.                                                                                     |
| `pattern_insight_narrative`     | Narrative + sparkline insights for a resource (period-aware)                                                                                                                                                                         |
| `pattern_master_detail`         | Split-panel: list + detail side by side                                                                                                                                                                                              |
| `pattern_settings`              | Tabbed settings/preferences page                                                                                                                                                                                                     |
| `pattern_wizard_form`           | Multi-step wizard form with validation                                                                                                                                                                                               |
| `pattern_profile`               | User/entity profile page with sections                                                                                                                                                                                               |
| `pattern_calendar`              | Calendar view for date-based resources                                                                                                                                                                                               |
| `pattern_map`                   | Interactive map with react-leaflet (geographic data, markers, popups)                                                                                                                                                                |
| `pattern_kanban`                | Kanban board with draggable columns                                                                                                                                                                                                  |
| `pattern_timeline`              | Chronological timeline view                                                                                                                                                                                                          |
| `pattern_landing`               | Landing/marketing page layout                                                                                                                                                                                                        |
| `pattern_pricing`               | Pricing table/comparison page                                                                                                                                                                                                        |
| `pattern_onboarding`            | Guided onboarding flow                                                                                                                                                                                                               |
| `validate_build`                | TypeScript + ESLint check. `summarize: true` returns top-N diagnostics for low-tier models.                                                                                                                                          |
| `sandbox_smoke`                 | GET-only runtime smoke test — hits every page.tsx URL on the running sandbox and classifies 2xx/4xx/5xx                                                                                                                              |
| `sandbox_mutation_smoke`        | POST→DELETE smoke test for every spreadsheet-derived resource. **Opt-in** (`allowMutations: true`). Builds minimal payload from Prisma columns; cleans up after each cycle.                                                          |
| `diff_preview`                  | Preview file changes before applying (dry-run diff)                                                                                                                                                                                  |
| `generate_tests`                | Generate tests for React components                                                                                                                                                                                                  |
| `generate_user_docs`            | Generate end-user documentation (README + screenshots placeholders) for the live app                                                                                                                                                 |
| `list_playbooks`                | List available multi-skill playbooks                                                                                                                                                                                                 |
| `get_playbook`                  | Get a specific playbook with execution steps                                                                                                                                                                                         |
| `run_playbook`                  | Execute a full playbook (sequence of skills)                                                                                                                                                                                         |
| `design_init`                   | Initialize design system with intent-first protocol                                                                                                                                                                                  |
| `design_status`                 | Show current design system state and patterns                                                                                                                                                                                        |
| `design_critique`               | Deep craft critique (composition, craft, content, structure, states)                                                                                                                                                                 |
| `design_validate`               | Audit code against design system for consistency                                                                                                                                                                                     |
| `design_extract`                | Extract design patterns from existing code                                                                                                                                                                                           |
| `design_save_system`            | Save design decisions to `.dynamicfront/system.md`                                                                                                                                                                                   |
| `design_showroom`               | Interactive component showroom / storybook-like preview                                                                                                                                                                              |
| `design_reference_search`       | Query the Design Arsenal (godly, 21st, motionsites, spline) for curated visual references BEFORE emitting any pattern\_\* or scaffold_page                                                                                           |
| `design_reference_harvest`      | Record a new design reference in the Arsenal (admin/dev use)                                                                                                                                                                         |
| `design_reference_catalog`      | List Design Arsenal sources + counts                                                                                                                                                                                                 |
| `data_source_strategy_resolver` | Deterministic planner for a new workspace — returns auth strategy + resource source map + recommended skill order. CALL FIRST on any new workspace, before `analyze_api`                                                             |
| `apply_schema_change`           | Evolve Prisma schema (ADD/DROP/RENAME column) on existing tables — used in response to `schema_evolution_detected` events on re-upload                                                                                               |
| `napkin_read`                   | Read persistent workspace learnings runbook                                                                                                                                                                                          |
| `napkin_update`                 | Update workspace learnings with new patterns/mistakes                                                                                                                                                                                |
| `read_sandbox_logs`             | Read logs from the sandbox container                                                                                                                                                                                                 |
| `http_request`                  | Make HTTP requests to test API endpoints                                                                                                                                                                                             |
| `ralph_loop`                    | Autonomous continuous dev loop with circuit breaker (reads PROMPT.md)                                                                                                                                                                |
| `claude_mem`                    | Persistent session memory — decisions, errors, preferences                                                                                                                                                                           |
| `frontend_design`               | Professional UI/UX design guidance with Tailwind CSS patterns                                                                                                                                                                        |
| `code_review`                   | Multi-dimensional code review (security, performance, readability)                                                                                                                                                                   |
| `build_progress`                | Track build progress phases in real-time                                                                                                                                                                                             |
| `export_data`                   | Export data source as Excel, CSV, or SQL                                                                                                                                                                                             |
| `export_html`                   | Export data source as standalone HTML                                                                                                                                                                                                |
| `unify_data_sources`            | Unify multiple data sources into a single schema                                                                                                                                                                                     |
| `data_filters`                  | Add filtering UI to data tables                                                                                                                                                                                                      |
| `data_export`                   | Client-side data export functionality                                                                                                                                                                                                |
| `data_import`                   | Client-side data import functionality                                                                                                                                                                                                |
| `data_charts`                   | Chart visualizations for data                                                                                                                                                                                                        |
| `data_stats`                    | Statistical summaries and KPIs                                                                                                                                                                                                       |
| `data_search`                   | Full-text search across data                                                                                                                                                                                                         |
| `data_infinite_scroll`          | Infinite scroll pagination                                                                                                                                                                                                           |
| `ux_empty_states`               | Empty state placeholders                                                                                                                                                                                                             |
| `ux_error_pages`                | Error page templates (404, 500, etc.)                                                                                                                                                                                                |
| `ux_loading`                    | Loading state patterns                                                                                                                                                                                                               |
| `ux_notifications`              | Toast/notification system                                                                                                                                                                                                            |
| `ux_confirm_dialog`             | Confirmation dialogs                                                                                                                                                                                                                 |
| `ux_dark_mode`                  | Dark mode toggle and theme                                                                                                                                                                                                           |
| `ux_responsive`                 | Responsive layout patterns                                                                                                                                                                                                           |
| `ux_command_palette`            | Command palette (Cmd+K)                                                                                                                                                                                                              |
| `ux_breadcrumbs`                | Breadcrumb navigation                                                                                                                                                                                                                |
| `integration_realtime`          | Real-time data with WebSocket/SSE                                                                                                                                                                                                    |
| `integration_file_upload`       | File upload components                                                                                                                                                                                                               |
| `integration_map`               | Map integration (react-leaflet)                                                                                                                                                                                                      |
| `integration_rich_text`         | Rich text editor                                                                                                                                                                                                                     |
| `integration_pdf`               | PDF generation/preview                                                                                                                                                                                                               |
| `integration_i18n`              | Internationalization setup                                                                                                                                                                                                           |
| `integration_a11y`              | Accessibility improvements                                                                                                                                                                                                           |
| `integration_analytics`         | Analytics integration                                                                                                                                                                                                                |
| `integration_pwa`               | Progressive Web App setup                                                                                                                                                                                                            |

> The public catalog is served by `POST /mcp/skills` via `tools/list` and assembled automatically by `ToolRegistryService`.

### Sandbox (live preview)

- Each generated project runs in a dedicated Docker container based on `dynamicfront-sandbox`.
- `SandboxService` creates/manages containers via `docker run`; state persisted in `SandboxInstance`.
- Code is bind-mounted from `workspaces/<slug>/` on the host into `/workspace` in the container.
- SDK is bind-mounted via `SDK_PATH` env var.
- Ports 4000–4090 allocated on the host; the frontend subscribes to `sandbox:logs` via Socket.IO.
- Orphaned containers are detected and stopped on `onModuleInit`.

### OpenCode container management

- One OpenCode Docker container per **user** (keyed by `userId`), state persisted in `OpencodeInstance`.
- Per-workspace clients are thin HTTP wrappers that set `x-opencode-directory` header.
- Idle instances killed after 30 minutes (`IDLE_TIMEOUT_MS`).
- Ports 5000–5999 allocated dynamically; in-flight spawns guarded by a promise map.
- SDK mounted read-only: `-v <SDK_PATH>:/home/node/sdk:ro`
- MCP skills reachable from containers via `http://host.docker.internal:{PORT}/mcp/skills`

### Generated projects

- New workspaces auto-scaffold a Next.js project from `backend/templates/nextjs-base/`.
- Template is **minimal**: layout, globals.css, sonner, AGENTS.md, opencode.json. No example code.
- Project directory: `workspaces/<name-slug>-<workspaceId>/`.
- Path stored in `Project.path` in the database.
- Deleting a workspace stops the sandbox, cascade-deletes DB records, and `rm -rf`s the project dir.

---

## Key Conventions

### Backend (NestJS)

- **All routes are JWT-protected by default** via a global `APP_GUARD`. Use `@Public()` to opt out.
- Use `@CurrentUser()` param decorator (`auth/current-user.decorator.ts`) to get `{ id, email, role }` in controllers.
- **Always use `.js` extensions in TypeScript imports** — required for ESM compatibility:
  ```ts
  import { FooService } from "./foo.service.js";
  ```
- Logging: `new Logger(ClassName.name)` — never `console.log`.
- DTOs use `class-validator` decorators; `ValidationPipe({ whitelist: true, transform: true })` is global.
- `PrismaService` uses PostgreSQL — do not use SQLite-specific features or `prisma.$executeRaw` with raw SQL.
- File naming: `kebab-case` with role suffix — `chat.service.ts`, `api-docs.controller.ts`.
- Class naming: `PascalCase` — `ChatService`, `ApiDocsController`.
- DTOs live in `dto/` subdirectory within each module.
- MCP tool files follow the pattern `<verb>-<noun>.tool.ts`.

### MCP Skills (`backend/src/skills/`)

- Each tool: `@Injectable()` with `.definition` (McpToolDef) + `.execute(args)` → `string`.
- Register in `skills.module.ts` (as provider) and `skills-mcp.controller.ts` (in the tool map).
- `WorkspaceResolverService` resolves `projectDir` → workspace with apiDocs.
- Skills parse OpenAPI specs directly from the database (no file I/O).

### E2E Tests

- Each suite creates its own isolated database via `test/helpers/test-app.ts`.
- Pattern:
  ```ts
  const { app, prisma, dbPath } = await createTestApp("my-suite");
  afterAll(() => teardownTestApp(app, dbPath));
  afterEach(() => cleanDb(prisma));
  ```

### Frontend (Next.js App Router)

- **App Router** (`src/app/`): `layout.tsx`, `(authenticated)/` route group, `login/`.
- State lives in **Zustand stores** (`src/store/`): `workspaceStore`, `modelStore`, `agentSessionStore`, `resourceStore`, `uiStore`, `chatStore`, `planStore`, `buildPhaseStore`, `questionSelectionsStore`, `dataSourceStore`.
- Custom hooks (`src/hooks/`): `useChat`, `useAgentSession`, `useAIAvailability`, `useResourceActions`, `useChatActions`, `useWorkspaceRouter`, `useSmartSuggestions`, `useToast`.
- API calls use `authFetch` (wraps `fetch` with JWT) from `src/utils/authFetch`.
- Backend base URL: `NEXT_PUBLIC_API_BASE_URL` env var (consumed via `src/utils/config`).
- Socket.IO connects to the `/chat` namespace; sandbox events use the same connection.
- `agentMode`: `'build'` (default, executes immediately) | `'plan'` (AI drafts plan, user approves).
- `strict: true` TypeScript — no implicit `any`, strict null checks.
- Path alias `@/*` maps to `./src/*`:
  ```ts
  import { useChat } from "@/hooks/useChat";
  ```

### Zero Domain Bias

**Never hardcode domain knowledge** (e.g., "students", "patients", "products") in agents, services, or UI components. All business logic must be driven by the connected API's structure.

Apply the **Hospital Test**: if you connected a hospital API right now, would your code break or show education-specific terms?

### Live-Data Contract (generated UIs)

Skills that emit list pages and dashboards (`scaffold_page`, `pattern_dashboard_mixed`) MUST produce code that:

1. Computes KPIs via `GET /api/<resource>/stats` (filter-aware, server-side aggregation) — never by summing paginated rows client-side, never by reading pre-computed summary rows from the spreadsheet snapshot. For MoM/WoW variation use `/stats?compare=prev_period`. For time evolution use `/api/<resource>/timeseries?bucket=day|week|month`. For cumulative balances (saldo acumulado / projected cashflow) use `/api/<resource>/running-total?metric=...&sortBy=<date>&signColumn=<tipo>&positiveValues=Entrada`.
2. Writes mutations against the live source table — never against a frozen snapshot.
3. Maintains `refreshKey` state, includes it in every data `useEffect` dep array, and passes `onSuccess={refresh}` to every mutation component.
4. **Period-aware insight panels** — every `<ResourceInsights>` component (`pattern_insight_dashboard`, `pattern_insight_narrative`) MUST accept `dateFrom`/`dateTo`/`refreshKey` props and forward them to the API. NEVER bake a hardcoded `monthRange()`/`new Date()` "current month" inside the component — that locks insights to "today" regardless of `<PeriodFilter>`. Title must be neutral ("Insights do período"), not "Insights do Mês".
5. **Status KPIs follow the period filter** — `A Receber`, `A Pagar`, `Pendente`, etc. MUST be filtered by the same `dateFrom`/`dateTo` as Entradas/Saídas, with a `⚠ N vencidos · R$ X` sub-row computed by clamping `dateTo` to `min(dateTo, today)`.
6. **Auto-filters via `/meta/distinct`** — list pages with categorical columns auto-emit dropdown filters from `GET /api/<resource>/meta/distinct?column=<col>`. **Cross-resource FK links** — when a column is a foreign key, render the cell as `<Link>` to the referenced resource's detail page.
7. **Payload coercion is automatic on every CRUD DTO** — generated DTOs carry `class-transformer` `@Transform()` decorators: decimals accept pt-BR ("0,02", "1.234,56") and US ("1234.56"); empty strings on optional fields become `undefined`; date inputs are normalised to ISO. **Forms can `body: JSON.stringify(form)` directly** — no `parseFloat` / `new Date` / `?? null` needed in the client. A 500 on POST/PATCH now means P2003 (missing FK) or P2002 (unique violation), never type coercion.
8. **Status × Tipo coherence (cross-field validator)** — when the resource has both a polarity column (`tipo` Entrada/Saída, `movimento` Receita/Despesa, etc.) AND a status column with tokens from both sides (`A Receber`+`A Pagar`, `Recebido`+`Pago`), the DTO emits `@Validate(StatusMatchesTipoConstraint)`. Contradictions return 400. **The UI MUST mirror this**: filter the `<select>` for status by the watched `tipo`, and reset status to a compatible value when tipo changes. Neutral values (`Pendente`, `Em aberto`, `Cancelado`) stay available on both sides.
9. **Draft Batch / "Lançamentos pendentes"** — for high-frequency entry resources (date + value + status), the default form accumulates rows in local state + side-by-side review table with row-level Edit/Remove + a single "Lançar todos" button that fires `POST /api/<resource>/bulk`. A parallel "Lançar e fechar" button keeps the single-shot flow. Never trap users in batch-only mode.

Three reinforcing layers: `backend/templates/nextjs-base/AGENTS.md` ("🔁 LIVE DATA" + "6b. Insight panels MUST follow the period filter" + "Front ↔ Back Contract / Payload coercion / Status × Tipo" sections), `ChatContextService` (section 8 + period-filter + payload + status×tipo rules), and the skill-emitted code itself. Keep them in sync when touching the engine.

### Generated Next.js Projects (`AGENTS.md` in templates)

The AI agent writes code following `backend/templates/nextjs-base/AGENTS.md`. Key rules:

- **Use MCP skills** (`analyze_api` → `scaffold_*` / `pattern_*` → `validate_build`) — never write boilerplate manually.
- Output **raw TypeScript/TSX source** — never JSON, Python dicts, or serialized formats.
- Read a file before modifying it; make targeted changes.
- Import from `@dynamicfront/sdk` for all primitives and patterns.
- `NEXT_PUBLIC_API_URL` must always be set from the injected API docs context.
- Server Components by default; push `'use client'` to leaf components only.

---

## Code Style

### Prettier (backend)

```json
{ "singleQuote": true, "trailingComma": "all" }
```

### TypeScript — backend

- `target: ES2023`, `module: nodenext`, `moduleResolution: nodenext`
- `strictNullChecks: true`, `noImplicitAny: false` (not full strict mode)
- `emitDecoratorMetadata: true`, `experimentalDecorators: true` (NestJS DI required)

### TypeScript — client

- `strict: true` (full strict mode)
- `module: esnext`, `moduleResolution: node`

---

## Environment Setup

### Docker (recommended)

```bash
docker build -t dynamicfront_opencode:latest -f Dockerfile.opencode .
docker build -f Dockerfile.sandbox -t dynamicfront-sandbox .
docker compose up --build
```

Key variables in `backend/.env.docker`:

```env
JWT_SECRET=<strong secret>
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/dynamicfront
WORKSPACES_DIR=./generated-workspaces
SDK_PATH=/absolute/host/path/to/backend/packages/dynamicfront-sdk
WORKSPACES_HOST_PATH=/absolute/host/path/to/workspaces
ANTHROPIC_API_KEY=   # at least one LLM key required
OPENAI_API_KEY=
```

### Local (no Docker)

`backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dynamicfront
PORT=3001
WORKSPACES_DIR=./generated-workspaces
JWT_SECRET=<any string>
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
SDK_PATH=/absolute/path/to/backend/packages/dynamicfront-sdk
SANDBOX_IMAGE=dynamicfront-sandbox
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CLIENT_REDIRECT_URL=http://localhost:3001/auth/google/callback
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_CLIENT_REDIRECT_URL=http://localhost:3001/auth/microsoft/callback
FRONTEND_URL=http://localhost:3000
```

`client/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## Git & Commit Standards

Follow **Conventional Commits**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.
