# easy-cms — agent guide

Multi-tenant SaaS website builder & headless CMS. pnpm monorepo.

## Layout
- `apps/web` — Next.js 15 App Router. Marketing (`/`), auth (`(auth)`),
  dashboard (`(dashboard)`), builder, and public site rendering (`_sites`).
- `packages/db` — Prisma schema (`prisma/schema.prisma`), client, seed.
- `packages/core` — framework-free domain logic: `rbac.ts`, `builder.ts`
  (block tree schema), `tenant.ts` (host → tenant resolution).
- `docs/` — PRD, architecture, ERD, API, security, deployment, roadmap.

## Conventions
- **Multi-tenancy:** every tenant query is scoped by `organizationId`/`siteId`.
  Add new data access in `apps/web/src/lib/data` and gate writes with
  `requirePermission()` from `src/lib/guards.ts`.
- **Builder:** pages store a `BlockNode[]` tree (`packages/core/builder.ts`).
  Add UI blocks by registering them in `components/builder/registry.tsx`.
- **Validation:** all external input is parsed with Zod before persistence.
- Run `pnpm typecheck` before committing. DB changes: edit schema then
  `pnpm db:migrate`.
