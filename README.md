# easy-cms

A **multi-tenant SaaS website builder & headless CMS** — build, manage, and
publish multiple websites with a drag-and-drop builder, a flexible content
model, blogs, media, forms, SEO, billing, and AI assistance.

Think Webflow × Wix × WordPress, but simple for non-technical users.

> **Status: foundation.** This repository contains a runnable, production-grade
> foundation (monorepo, schema, auth, multi-tenancy, builder data model &
> renderer) plus the complete architecture/PRD documentation set in
> [`docs/`](./docs). It is the scaffold a team builds the full product on — not
> a finished Webflow clone. See [`docs/11-roadmap.md`](./docs/11-roadmap.md) for
> what's in the MVP vs. later phases.

## Tech stack

| Layer        | Choice                                             |
| ------------ | -------------------------------------------------- |
| Framework    | Next.js 15 (App Router) + React 19 + TypeScript    |
| Styling      | TailwindCSS + shadcn/ui patterns                   |
| Database     | PostgreSQL + Prisma                                |
| Auth         | Better Auth (email/password + Google/GitHub/FB)    |
| Builder      | dnd-kit + Zustand editor store (undo/redo/autosave)|
| Rich text    | Tiptap                                             |
| Validation   | Zod                                                |
| Storage      | S3-compatible / Cloudflare R2                      |
| Cache/queues | Redis                                              |
| Billing      | Stripe                                             |
| AI           | Claude API                                         |

## Monorepo layout

```
apps/
  web/            Next.js app: marketing, dashboard, builder, public site rendering
packages/
  db/             Prisma schema, client, seed
  core/           Domain logic: RBAC, builder block schema, tenant resolution
docs/             PRD, architecture, ERD, API, roadmap, security, deployment, …
```

## Multi-tenancy

Shared database with **row-level isolation**. Every tenant row carries
`organizationId` (and `siteId` where relevant); all data access is scoped in
`apps/web/src/lib/data`. Public sites are resolved from the request host
(custom domain or `{slug}.{ROOT_DOMAIN}`) by `middleware.ts`, which rewrites to
the `/_sites/[domain]` route group rendered with ISR.

## Getting started

```bash
# 1. Install deps
pnpm install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Configure env
cp .env.example .env   # fill in secrets

# 4. Set up the database
pnpm db:generate
pnpm db:push          # or: pnpm db:migrate
pnpm db:seed          # plans, default theme, demo org/site/page

# 5. Run
pnpm dev              # http://localhost:3000
```

Seeded super admin: `admin@easycms.app` · demo site slug: `demo-site`.

## Documentation

Start at [`docs/README.md`](./docs/README.md) for the full index: Product
Requirements, System Architecture, Database Schema/ERD, API Design, Builder &
CMS architecture, Auth, Security, Billing, AI features, Deployment, and the
phased Roadmap.

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Run the web app                      |
| `pnpm build`       | Production build                     |
| `pnpm typecheck`   | Type-check all packages              |
| `pnpm db:migrate`  | Run Prisma migrations                |
| `pnpm db:seed`     | Seed baseline data                   |
| `pnpm db:studio`   | Open Prisma Studio                   |
