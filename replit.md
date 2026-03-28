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

Expo React Native app for LOA (Letter of Authorization) origination in commercial real estate.

**Design**: Navy blue `#1B3A6B` primary, golden amber `#C8963E` accent, `#F4F6FA` background.

**Data Model (3NF-compliant)**:
- `Borrower` — `firstName` + `lastName` (separate fields), `entityName`, contact, financial profile (`netWorthUsd`, `liquidityUsd`, `creditScore`, `creExperienceYears`)
- `Property` — location (street/city/state/zip), `propertyType`, `grossSqFt` (SF), `numberOfUnits`, `yearBuilt`, **two occupancy fields**:
  - `physicalOccupancyPct` — unit-based (occupied units ÷ total rentable units)
  - `economicOccupancyPct` — rent-based (collected rent ÷ potential gross rent)
- `LOAApplication` — loan terms only (`loanAmountUsd`, `ltvPct`, `dscrRatio`, `interestRatePct`, `loanTermYears`, etc.) + foreign keys `borrowerId` + `propertyId`. No data duplicated.
- `Comment` — threaded via `parentCommentId: string | null` (null = root, string = reply)
- `Attachment` — document metadata (uri, name, mimeType, sizeBytes) via expo-document-picker

**Storage**: AsyncStorage keys — `loa_applications_v2`, `loa_borrowers_v2`, `loa_properties_v2`, `loan_conditions_v1`, `loan_exceptions_v1`, `loan_rent_roll_v1`, `loan_operating_history_v1`, `loan_tasks_v1`

**Data Model (3NF) — full entity list**:
- `Borrower`, `Property`, `LOAApplication` (with `borrowerId` + `propertyId` FK)
- `Condition`, `Exception` (per application)
- `RentRollUnit` — MISMO RentRollItemType, per property. MF fields (monthly/market rent) + commercial fields (annual base rent, PSF, lease type, renewal options, tenant industry)
- `OperatingYear` — MISMO IncomeExpenseStatementType, per property. Up to 5 periods (Actual Y1/Y2, T12, Budget, Lender UW). NOI = EGI − totalOperatingExpenses.
- `LoanTask` — per application + phase. Auto-seeded from PHASE_INFO checklist on first screen open. Custom tasks flagged `isCustom: true`.
- `Comment` — threaded via `parentCommentId`
- `Attachment` — document metadata

**Key screens** (all under `app/application/[id]/`):
- `index.tsx` — Overview: timeline, metrics strip, nav groups (Loan / Client / Property / Tasks)
- `loan.tsx` — Loan terms, inline editing
- `borrower.tsx` — Borrower profile, inline editing
- `property.tsx` — Property details, inline editing
- `amortization.tsx` — Amortization calculator
- `credit-evaluation.tsx` — Credit box, LOI, commitment letter
- `processing.tsx` — Processing & compliance
- `closing-details.tsx` — Closing details
- `conditions.tsx` — Conditions & exceptions (3NF)
- `comments.tsx` — Threaded comments
- `documents.tsx` — Document attachments
- `rent-roll.tsx` — MISMO rent roll: unit cards, occupancy stats, add/edit/delete units
- `operating-history.tsx` — MISMO operating history: period cards with income/expense breakdown, NOI calc, add/edit/delete
- `tasks.tsx` — Phase-grouped checklist: auto-seeded from PHASE_INFO, toggle, add custom tasks, progress bars

**phases.ts**: PHASE_ORDER (10 phases), PHASE_INFO (phase metadata + checklists). Imported by screens, never by ApplicationContext (avoids circular import). Task seeding happens inside `tasks.tsx` by passing PHASE_INFO data into `addTasksBatch`.

**Key components**:
- `CommentThread.tsx` — Threaded comments with inline reply forms, collapse/expand
- `AttachmentList.tsx` — Document picker integration with file metadata display
- `ApplicationCard.tsx` — Card with live borrower/property lookups from context

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
