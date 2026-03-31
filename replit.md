# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native app — LOA Origination System for commercial real estate lending.

**Design**: Salt Design System / J.P. Morgan Brand — teal-500 `#1B7F9E` primary, blue-900 `#001736` dark surface, `#E6E9EB` background, Open Sans typography.

**Architecture**: Full microservices — 12 independent service contexts, zero cross-service imports. Services communicate only through `applicationId` strings.

**Census Integration**: `services/census/index.tsx` — lightweight hook (`useCensusData`) wrapping the **U.S. Census Bureau Geocoding API** (free, no API key). Accepts a `PropertyLocation`, calls `geographies/address` endpoint with `Public_AR_Current` benchmark + `Current_Current` vintage, returns state/county FIPS, census tract, block group, congressional district, and standardized address. Results cached in AsyncStorage under `svc_census_v1_{locationId}`. Surfaced via `CensusCard` component in the Property → Location tab (below the map per location). No Context provider needed — purely a per-component hook.

**Services** (`services/`):
| Service | Storage Key(s) | Responsibility |
|---|---|---|
| `core` | `svc_core_apps_v2`, `svc_core_borrowers_v2`, `svc_core_properties_v3` | LoanApplication (100), Borrower (70), Property (100), pipeline stats. `RateType` = "Fixed Rate" \| "Adjustable Rate" \| "Hybrid". 9 rate pricing fields on `LoanApplication` (stored 6dp, displayed 3dp). |
| `inquiry` | `svc_inquiry_notes_v2`, `svc_inquiry_rent_roll_v2`, `svc_inquiry_op_history_v2` | 88 inquiry notes, rent roll units (MISMO), operating history years (MISMO) |
| `initial-credit-review` | `svc_icr_v1` | ICR record per app (73 records): credit box notes, LOI issued/expiration |
| `application` | `svc_application_v1` | Application Start + Processing: deposit, signed LOI, rate lock, appraisal, env status, borrower forms |
| `final-credit-review` | `svc_fcr_v2`, `svc_exceptions_v2` | FCR record per app (40 records), Exceptions (12 seeded) |
| `closing` | `svc_closing_v3` | Pre-Close (HMDA), Ready for Docs (insurance/title), Docs Drawn, Docs Back, Wire & Servicing/Booking |
| `conditions` | `svc_conditions_v3` | Loan conditions (Pre-close checklist, conditions CRUD) |
| `documents` | `svc_documents_v1` | Attachment metadata |
| `tasks` | `svc_tasks_v1` | LoanTask per application+phase, seed/toggle/custom |
| `admin-access` | (in-memory) | Admin roles — user management |
| `rbac` | (in-memory) | 73-test RBAC engine, profile entitlements |
| `session` | (in-memory) | Current user identity / active persona |

**Providers**: `services/providers.tsx` wraps all 12 service providers. `services/seed-coordinator.tsx` orchestrates seeding across all services.

**Rent Roll & Operating History**: Stored in the `inquiry` MS but surfaced in the overview nav for **Letter of Interest**, **Processing**, and **Credit Review** MS sections — reflecting the phases where these are actively reviewed.

**Key screens** (all under `app/application/[id]/`):
- `index.tsx` — Overview: badge counts from 5 services, status advance/retreat
- `loan.tsx` — Phase-snapshot editing via `usePhaseDataService`. Terms card + Fixed Rate card (always) + Adjustable Rate card (Adjustable/Hybrid only). Live computed `allInFixedRate` and `proformaAdjustableAllInRate` (6dp stored, 3dp displayed). Variance fields accept negative values.
- `borrower.tsx`, `property.tsx` — `useCoreService` inline editing
- `amortization.tsx` — Amortization calculator, reads loan terms from core
- `credit-evaluation.tsx` — `useLetterOfInterestService` + `useFinalCreditReviewService`
- `processing.tsx` — `useProcessingService` + `usePreCloseService`
- `closing-details.tsx` — 4 services: ready-for-docs, docs-drawn, docs-back, closing
- `conditions.tsx` — `useFinalCreditReviewService` (conditions + exceptions CRUD)
- `comments.tsx` — `useCommentsService` threaded comments
- `documents.tsx` — `useDocumentsService` attachment management
- `rent-roll.tsx` — `useInquiryService` (MISMO RentRollItemType, by applicationId)
- `operating-history.tsx` — `useInquiryService` (MISMO IncomeExpenseStatementType)
- `tasks.tsx` — `useTasksService` (seeded from PHASE_INFO checklists, phase-grouped)

**phases.ts**: PHASE_ORDER (10 phases), PHASE_INFO (phase metadata + checklists per phase). Used in task seeding and UI.

**Key components**:
- `CommentThread.tsx` — accepts `comments: Comment[]` prop, threaded with collapse; `readOnly` prop hides add/delete when user lacks `canEdit`
- `AttachmentList.tsx` — `Attachment` type from `@/services/documents`; `readOnly` prop hides add/delete when user lacks `canEdit`
- `AmortizationCalculator.tsx` — accepts `LoanApplication` from `@/services/core`
- `ApplicationCard.tsx` — reads borrower/property from core service
- `StatusBadge.tsx` — `ApplicationStatus` from `@/services/core`
- `AccessDenied.tsx` — full-screen gate rendered when `canView` is false; shows lock icon + "Access Denied" + `screenLabel`

**RBAC / Permissions** (all 20 screens fully guarded):
- `hooks/usePermission.ts` — calls `rbacService.hasPermission(key, "view"|"edit")`, returns `{ canView, canEdit }`. Bypasses if `currentSid === null`.
- `services/rbac/` — role-based access control; `services/session/` — current user identity
- Every screen (all 20 under `app/application/[id]/` plus tab screens) has: `usePermission` hook call, `if (!canView) return <AccessDenied/>` guard, and `canEdit &&` / ternary gates on all add/save/delete/advance buttons
- Permission keys: `borrower.profile`, `property.profile`, `loan.terms`, `amortization.calc`, `credit.evaluation`, `inquiry.op-history`, `inquiry.rent-roll`, `inquiry.disposition`, `commitment.letter`, `collaboration.comments`, `collaboration.tasks`, `documents.main`, `loan-team.main`, `conditions.main`, `exceptions.main`, `processing.main`, `closing.main`, `app-start.disposition`, `core.dashboard`, `core.applications`

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
