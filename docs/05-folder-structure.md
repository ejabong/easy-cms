# easy-cms — Folder Structure & Monorepo Layout

> Document 05 of the easy-cms documentation set. See [README](./README.md) for the full index.

This document is the canonical map of the easy-cms repository: every directory
and significant file that exists on disk today, what it is responsible for, and
where new code should go. It complements the high-level
[System Architecture](./02-architecture.md) (which explains *why* the pieces
exist) by being precise about *where* they live.

easy-cms is a **pnpm workspace monorepo**. There is exactly one deployable
application (`apps/web`, the Next.js 15 App Router app) and two internal,
source-only TypeScript packages (`packages/db` and `packages/core`) that the app
consumes via workspace links. There is no build step for the packages: they
export their `src/` directly, and TypeScript path resolution stitches everything
together.

---

## 1. Annotated repository tree

The tree below reflects the **actual** state of the repository. Anything marked
`(planned)` is referenced in the architecture document but does **not** yet
exist on disk — see [§6 Aspirational vs. real](#6-aspirational-vs-real).

```text
easy-cms/
├── package.json                 # Root workspace manifest. packageManager: pnpm@10.9.0,
│                                #   engines.node >=20. Holds the top-level scripts that
│                                #   fan out to workspaces via pnpm --filter / pnpm -r.
├── pnpm-lock.yaml               # Single lockfile for the whole workspace.
├── pnpm-workspace.yaml          # Declares the workspace globs: apps/* and packages/*.
├── tsconfig.base.json           # Shared compiler options; every package/app extends this.
├── Dockerfile                   # Production image for the web app (multi-stage build).
├── docker-compose.yml           # Local dev infra: PostgreSQL + Redis.
├── .env.example                 # Documented environment variables (copy to .env).
├── .prettierrc                  # Formatting rules (Prettier).
├── .gitignore
├── CLAUDE.md                    # Conventions/instructions for AI-assisted contributions.
├── README.md                    # Project overview + getting-started.
├── .github/
│   └── workflows/
│       └── ci.yml               # CI pipeline: install, lint, typecheck, build.
├── docs/                        # The documentation set (you are reading 05).
│   ├── 01-PRD.md
│   ├── 02-architecture.md
│   ├── 05-folder-structure.md   # ← this document
│   └── 06-builder-architecture.md
│
├── apps/
│   └── web/                     # The only deployable app: marketing + dashboard +
│       │                        #   builder + public (tenant) site rendering.
│       ├── next.config.mjs      # Next.js config (images, experimental flags, etc.).
│       ├── tailwind.config.ts   # TailwindCSS theme/content config.
│       ├── postcss.config.mjs   # PostCSS pipeline (tailwind + autoprefixer).
│       ├── tsconfig.json        # Extends tsconfig.base.json; defines the @/* path alias.
│       ├── package.json         # name: @easy-cms/web. Depends on @easy-cms/core & /db
│       │                        #   (workspace:*), dnd-kit, tiptap, better-auth, zustand…
│       └── src/
│           ├── middleware.ts    # Tenant routing. Rewrites non-platform hosts to /_sites.
│           ├── app/             # App Router tree (route groups below).
│           │   ├── layout.tsx   # Root layout (html/body, fonts, providers).
│           │   ├── page.tsx     # Marketing/landing page (platform apex).
│           │   ├── globals.css  # Tailwind directives + global styles.
│           │   │
│           │   ├── (auth)/                      # Route group: authentication screens.
│           │   │   ├── login/page.tsx           # Sign-in form (Better Auth client).
│           │   │   └── signup/page.tsx          # Registration form.
│           │   │
│           │   ├── (dashboard)/                 # Route group: the authenticated control plane.
│           │   │   ├── layout.tsx               # Dashboard chrome (nav, session guard).
│           │   │   ├── dashboard/page.tsx       # Org/site overview.
│           │   │   └── sites/[siteId]/builder/[pageId]/
│           │   │       ├── page.tsx             # Server component: loads Page, parses content,
│           │   │       │                        #   renders <BuilderEditor/>.
│           │   │       ├── editor.tsx           # Client builder shell (DndContext, toolbar).
│           │   │       └── actions.ts           # 'use server' savePage() action.
│           │   │
│           │   ├── _sites/[domain]/[[...slug]]/ # Delivery plane: published tenant sites.
│           │   │   └── page.tsx                 # ISR (revalidate=60) public render via BlockRenderer.
│           │   │
│           │   └── api/                         # Route handlers (non-RSC HTTP endpoints).
│           │       ├── auth/[...all]/route.ts   # Better Auth catch-all (GET/POST handler).
│           │       └── health/route.ts          # Liveness/readiness probe.
│           │
│           ├── components/
│           │   └── builder/                     # The visual builder UI (see doc 06).
│           │       ├── registry.tsx             # REGISTRY of block variants + inspector schema.
│           │       ├── canvas.tsx               # Sortable, selectable editing surface.
│           │       ├── palette.tsx              # Left rail of draggable blocks (palette: ids).
│           │       ├── inspector.tsx            # Right rail props editor (registry-driven fields).
│           │       ├── block-renderer.tsx       # Recursive tree → React; shared editor + public.
│           │       ├── sections/                # Section-level block components.
│           │       │   ├── hero.tsx             #   exports HeroCentered, HeroSplit
│           │       │   ├── rich-text.tsx
│           │       │   ├── feature-grid.tsx
│           │       │   ├── cta.tsx
│           │       │   ├── testimonials.tsx
│           │       │   ├── pricing.tsx
│           │       │   ├── faq.tsx
│           │       │   └── stats.tsx
│           │       └── components/
│           │           └── primitives.tsx       # Component-level blocks: Button, Heading, Image.
│           │
│           └── lib/
│               ├── utils.ts                      # cn() and small helpers.
│               ├── auth.ts                        # Better Auth server instance (Prisma adapter).
│               ├── auth-client.ts                 # Better Auth React client (signIn/up/out…).
│               ├── guards.ts                      # requireSession / requirePermission (RBAC gate).
│               ├── data/
│               │   └── sites.ts                   # Tenant-scoped data access (sites + pages).
│               └── store/
│                   └── editor.ts                  # Zustand editor store (undo/redo/autosave state).
│
└── packages/
    ├── db/                       # @easy-cms/db — Prisma schema + client singleton.
    │   ├── package.json          # exports "." → src/index.ts, "./client" → src/client.ts.
    │   │                         #   Scripts: generate/migrate/deploy/push/seed/studio.
    │   ├── tsconfig.json
    │   ├── prisma/
    │   │   ├── schema.prisma      # The full data model (see doc 03).
    │   │   └── seed.ts            # Seeds plans, default theme, demo org/site/page.
    │   └── src/
    │       ├── client.ts          # PrismaClient singleton (globalThis-cached in dev).
    │       └── index.ts           # Re-exports prisma + everything from @prisma/client.
    │
    └── core/                     # @easy-cms/core — framework-agnostic domain logic.
        ├── package.json          # main/types → src/index.ts. Only dependency: zod.
        ├── tsconfig.json
        └── src/
            ├── index.ts           # Barrel: re-exports rbac, builder, tenant.
            ├── rbac.ts            # Roles, permissions, can()/atLeast() helpers.
            ├── builder.ts         # BlockNode type + Zod schemas + createBlock().
            └── tenant.ts          # resolveTenant(host, rootDomain) → TenantResolution.

# (planned, not yet present)
# packages/ui/      — shared shadcn/ui component library (referenced in doc 02 §Stack).
# packages/config/  — shared eslint/tailwind/ts config presets.
```

---

## 2. The `apps/web` route map: three planes, one app

A single Next.js app serves three distinct concerns, separated by App Router
**route groups** (parenthesised folders that organise routes without affecting
the URL) and the underscore-prefixed `_sites` group. `middleware.ts` is the
traffic cop that decides which plane a request lands in.

```text
                       incoming request (host + path)
                                   │
                          src/middleware.ts
                          resolveTenant(host)
              ┌────────────────────┴─────────────────────┐
        kind = 'platform'                        kind = 'site-*'
   (apex / app. / localhost)              (custom domain or {slug}.{root})
              │                                            │
   serve app routes normally                  rewrite → /_sites/{host}{path}
              │                                            │
   ┌──────────┴──────────┐                                 ▼
 (auth)   (dashboard)   api          _sites/[domain]/[[...slug]]/page.tsx (ISR)
```

| Route group | URL effect | Plane | Responsibility |
|---|---|---|---|
| *(none)* — `app/page.tsx` | `/` | Marketing | Public landing page on the platform host. |
| `(auth)` | `/login`, `/signup` | Control plane | Sign-in / registration screens (Better Auth client). |
| `(dashboard)` | `/dashboard`, `/sites/[siteId]/builder/[pageId]` | Control plane | The authenticated app: managing orgs, sites, pages, and the visual builder. Guarded by `requireSession()`. |
| `_sites` | rewritten internally to `/_sites/[domain]/[[...slug]]` | Delivery plane | Renders **published** tenant sites. Reached only via the middleware rewrite — never linked directly. Uses ISR (`revalidate = 60`). |
| `api` | `/api/*` | HTTP handlers | Route handlers that aren't React pages: `api/auth/[...all]` (Better Auth), `api/health`. The middleware explicitly never rewrites `/api`. |

The `(auth)` group is for **authentication pages**; `(dashboard)` is the
**control plane** where authenticated users build; `_sites` is the **delivery
plane** that the middleware rewrites tenant hosts into; and `api` holds
**route handlers**. The grouping keeps each plane's layout and conventions
isolated while sharing one deployment and one middleware. Tenant resolution
itself lives in `@easy-cms/core` (`resolveTenant`) so it can be reused by both
`middleware.ts` and the `_sites` page; see
[Builder Architecture](./06-builder-architecture.md) and
[CMS Architecture](./07-cms-architecture.md) for the rendering details.

---

## 3. `packages/core` — the domain layer

`@easy-cms/core` is **framework-agnostic** (its only dependency is `zod`). It
holds the rules that must be identical on the server, in the middleware, and in
the client. Everything is re-exported through the barrel `src/index.ts`:

```ts
// packages/core/src/index.ts
export * from './rbac';     // Role, Permission, can(), permissionsFor(), atLeast()
export * from './builder';  // BlockNode, *Schema, BREAKPOINTS, createBlock()
export * from './tenant';   // TenantResolution, resolveTenant()
```

| Module | Public surface | Used by |
|---|---|---|
| `rbac.ts` | `Role`, `Permission`, `PERMISSIONS`, `can()`, `permissionsFor()`, `atLeast()` | `lib/guards.ts` (`requirePermission`), `actions.ts` |
| `builder.ts` | `BlockNode`, `Breakpoint`, `BREAKPOINTS`, `responsiveStyleSchema`, `visibilitySchema`, `animationSchema`, `blockNodeSchema`, `pageContentSchema`, `PageContent`, `createBlock()` | builder UI, editor store, `savePage`, `_sites` page |
| `tenant.ts` | `TenantResolution`, `resolveTenant()` | `middleware.ts`, `_sites` page, `lib/data/sites.ts` |

Because `core` has no React/Next dependency, the same Zod schema validates a
page's block tree at **save time** (server action) and at **render time**
(public page), guaranteeing the editor and the published site agree on shape.

---

## 4. `packages/db` — the data layer

`@easy-cms/db` wraps Prisma. It does two things:

1. **Exposes a Prisma client singleton** (`src/client.ts`). The client is cached
   on `globalThis` in non-production so Next.js hot-reload doesn't open a new
   connection pool on every edit:

   ```ts
   // packages/db/src/client.ts (essence)
   export const prisma =
     globalForPrisma.prisma ?? new PrismaClient({ log: /* warn+error in dev */ });
   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
   ```

2. **Re-exports everything** through `src/index.ts` so consumers get both the
   singleton and the generated Prisma types from one import:

   ```ts
   // packages/db/src/index.ts
   export { prisma } from './client';
   export * from '@prisma/client';   // models, enums, Prisma namespace, types
   ```

The package's `package.json` also exposes a secondary entry, `@easy-cms/db/client`,
and owns all database scripts (`generate`, `migrate`, `deploy`, `push`, `seed`,
`studio`) which the root `package.json` proxies as `db:*`. The schema and seed
live under `prisma/`; the full model is documented in
[Database Schema](./03-database-schema.md).

---

## 5. Naming & import conventions

**Workspace package names.** Every package is namespaced `@easy-cms/*`:

| Package | Name | Import as |
|---|---|---|
| App | `@easy-cms/web` | (not imported — it's the deployable) |
| DB | `@easy-cms/db` | `import { prisma, type Prisma } from '@easy-cms/db'` |
| Core | `@easy-cms/core` | `import { can, resolveTenant, createBlock } from '@easy-cms/core'` |

App-internal modules use the **`@/` alias**, defined in `apps/web/tsconfig.json`
(`"@/*": ["./src/*"]`), e.g. `import { useEditor } from '@/lib/store/editor'`.
Cross-package code always uses the `@easy-cms/*` workspace alias, never relative
`../../packages/...` paths.

**File & symbol conventions.**

- React components: `PascalCase` exported functions; files are `kebab-case`
  (`block-renderer.tsx` exports `BlockRenderer`).
- Client components carry the `'use client'` directive; server actions carry
  `'use server'` at the top of the file (`actions.ts`).
- Hooks/stores: `useX` (`useEditor`); Zod schemas: `xSchema`
  (`pageContentSchema`); constants: `SCREAMING_SNAKE` (`PERMISSIONS`,
  `BREAKPOINTS`, `REGISTRY`).
- Dynamic route segments use bracket folders (`[siteId]`, `[pageId]`,
  `[[...slug]]` for optional catch-all).

---

## 6. Aspirational vs. real

The [System Architecture](./02-architecture.md) document references a shared UI
library and a shared config package:

| Referenced as | Status |
|---|---|
| `packages/ui` (shadcn/ui component library) | **Planned — not present.** shadcn/ui patterns currently live inline in `apps/web`. |
| `packages/config` (shared eslint/tailwind/ts presets) | **Planned — not present.** Config is currently per-app/per-package, all extending the root `tsconfig.base.json`. |

When these packages are introduced they should follow the same pattern as
`core`/`db`: source-only, `@easy-cms/ui` / `@easy-cms/config` names, added to the
`packages/*` workspace glob (already covered by `pnpm-workspace.yaml`).

---

## 7. Concern → location quick reference

| Concern | Lives in |
|---|---|
| Authentication (server) | `apps/web/src/lib/auth.ts` (Better Auth + Prisma adapter) |
| Authentication (client) | `apps/web/src/lib/auth-client.ts` |
| Auth HTTP handler | `apps/web/src/app/api/auth/[...all]/route.ts` |
| Session / permission guards | `apps/web/src/lib/guards.ts` (`requireSession`, `requirePermission`) |
| RBAC rules (roles, permissions) | `packages/core/src/rbac.ts` |
| Builder block schema & types | `packages/core/src/builder.ts` |
| Tenant resolution | `packages/core/src/tenant.ts` + `apps/web/src/middleware.ts` |
| Data access (tenant-scoped) | `apps/web/src/lib/data/*` (e.g. `sites.ts`) |
| Prisma client / models | `packages/db/src/{client,index}.ts`, `packages/db/prisma/schema.prisma` |
| Editor state (undo/redo/autosave) | `apps/web/src/lib/store/editor.ts` |
| Builder UI components | `apps/web/src/components/builder/*` |
| Block/section components | `apps/web/src/components/builder/sections/*`, `.../components/primitives.tsx` |
| Public site rendering | `apps/web/src/app/_sites/[domain]/[[...slug]]/page.tsx` |
| Save / publish action | `apps/web/src/app/(dashboard)/sites/[siteId]/builder/[pageId]/actions.ts` |

---

## 8. Where new code goes

**Adding a new builder section or component.**

1. Create the React component under
   `apps/web/src/components/builder/sections/<name>.tsx` (a section) or add it
   to `components/primitives.tsx` (a small component).
2. Register it in `apps/web/src/components/builder/registry.tsx`: add a
   `RegistryEntry` keyed by its `variant`, with `category`, `type`, `render`,
   `defaults`, and the `inspector` field schema.
3. That's it — `PALETTE`, the canvas, the inspector, and `BlockRenderer` all
   read from the registry, and the recursive `blockNodeSchema` already accepts
   any `variant`. No schema migration is needed. See
   [Builder Architecture](./06-builder-architecture.md) and the
   [Component Library](./12-component-library.md) catalog.

**Adding a data repository (a new query surface).**

- Put tenant-scoped queries in `apps/web/src/lib/data/<entity>.ts`, importing
  `prisma` from `@easy-cms/db`. Always scope by `organizationId`/`siteId` and
  enforce permissions upstream via `requirePermission` from `lib/guards.ts`.

**Adding an API route handler.**

- Create `apps/web/src/app/api/<name>/route.ts` exporting `GET`/`POST`/etc.
  Note that `middleware.ts` never rewrites `/api/*`, so handlers are reachable
  on every host. For mutations triggered from the dashboard UI, prefer a
  `'use server'` action colocated with the route (as with `savePage`) over a
  bespoke API route.

**Adding domain logic shared across planes.**

- If it must run identically in middleware, server, and client (rules,
  validation, pure helpers), it belongs in `packages/core` and should be
  re-exported from `src/index.ts`.
