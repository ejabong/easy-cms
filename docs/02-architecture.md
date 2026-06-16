# easy-cms — System Architecture

> Document 02 of the easy-cms documentation set. See [README](./README.md) for the full index.

This document describes the system architecture for **easy-cms**: a multi-tenant SaaS website builder & headless CMS built on Next.js 15 (App Router) + React 19 + TypeScript, PostgreSQL + Prisma, Better Auth, Redis, S3/Cloudflare R2, and Stripe, deployed via Docker/Vercel/Railway.

---

## 1. Architectural Goals

| Goal | Approach |
|---|---|
| Strict tenant isolation | Shared DB, row-level scoping by `orgId` / `siteId`, enforced in a data-access layer |
| Fast published sites | SSG + ISR + CDN for published pages; dynamic only in the editor |
| Low editor latency | Zustand client store + optimistic updates + debounced autosave |
| Horizontal scalability | Stateless app servers, Redis for cache/queues, object storage for media |
| Clear separation | **Control plane** (dashboard/editor/API) vs **Delivery plane** (published sites) |

---

## 2. C4-ish Context & Container Diagram

```mermaid
graph TB
  subgraph Users
    Owner[Site Owner / Editor]
    Visitor[Public Visitor]
    Dev[Developer / API Consumer]
  end

  subgraph Edge["Edge / CDN (Vercel Edge / Cloudflare)"]
    CDN[CDN + Edge Middleware<br/>tenant resolution by domain]
  end

  subgraph App["easy-cms Application (Next.js 15 - apps/web)"]
    Dashboard[Dashboard & Builder UI<br/>React 19 / Zustand / dnd-kit / Tiptap]
    RSC[Server Components / Route Handlers]
    Renderer[Published Site Renderer<br/>SSG / ISR]
    AuthSvc[Auth - Better Auth]
    REST[REST API]
    GQL[GraphQL API]
    Webhooks[Webhook dispatcher]
    AIService[AI Service - Claude API]
  end

  subgraph Data["Data & Infra"]
    PG[(PostgreSQL<br/>Prisma)]
    Redis[(Redis<br/>cache / queue / rate limit)]
    Storage[(S3 / Cloudflare R2<br/>media)]
    Jobs[Background Workers<br/>BullMQ]
  end

  subgraph External
    Stripe[Stripe Billing]
    DNS[DNS / ACME TLS]
    Claude[Anthropic Claude API]
  end

  Owner --> CDN --> Dashboard
  Visitor --> CDN --> Renderer
  Dev --> CDN --> REST
  Dev --> CDN --> GQL

  Dashboard --> RSC
  RSC --> AuthSvc
  RSC --> PG
  RSC --> Redis
  Renderer --> PG
  Renderer --> Redis
  RSC --> Storage
  REST --> PG
  GQL --> PG
  AIService --> Claude
  RSC --> AIService
  Webhooks --> Jobs
  Jobs --> PG
  Jobs --> Storage
  AuthSvc --> PG
  RSC --> Stripe
  Stripe --> Webhooks
  CDN --> DNS
```

---

## 3. Monorepo Structure (high level)

A Turborepo/pnpm monorepo. Full annotated tree is in [05-folder-structure.md](./05-folder-structure.md).

```
easy-cms/
├── apps/
│   └── web/              # Next.js 15 App Router app (dashboard, editor, renderer, APIs)
├── packages/
│   ├── db/               # Prisma schema, client, migrations, seed
│   ├── ui/               # shadcn/ui-based shared component library + design tokens
│   └── config/           # Shared config: tsconfig, eslint, tailwind preset, env schema
└── docs/                 # This documentation set
```

The `apps/web` boundary intentionally hosts both control plane and delivery plane; they are separated by **route groups and rendering strategy**, not by separate deployments (so they can later be split if scale demands).

---

## 4. Request Lifecycle

### 4.1 Dashboard / Builder request (authenticated control plane)

```mermaid
sequenceDiagram
  participant B as Browser
  participant E as Edge Middleware
  participant M as Next Middleware (tenant + auth)
  participant H as Route Handler / RSC
  participant DAL as Data-Access Layer
  participant DB as PostgreSQL
  participant R as Redis

  B->>E: GET app.easy-cms.com/dashboard/sites
  E->>M: forward
  M->>M: resolve host -> control plane
  M->>M: read Better Auth session cookie
  alt no session
    M-->>B: 302 /login
  else session valid
    M->>H: attach { userId, orgId }
    H->>DAL: listSites(orgId)
    DAL->>R: cache lookup (sites:org:{orgId})
    R-->>DAL: miss
    DAL->>DB: SELECT ... WHERE orgId = $1
    DB-->>DAL: rows
    DAL->>R: set cache
    DAL-->>H: scoped result
    H-->>B: RSC stream / JSON
  end
```

### 4.2 Published site request (delivery plane)

```mermaid
sequenceDiagram
  participant V as Visitor
  participant CDN as CDN / Edge
  participant MW as Tenant Middleware
  participant ISR as ISR Renderer
  participant DB as PostgreSQL
  participant R as Redis

  V->>CDN: GET clientsite.com/about
  CDN->>CDN: cache HIT? serve static HTML
  alt cache MISS / stale
    CDN->>MW: forward
    MW->>MW: resolve domain -> siteId (Redis-backed)
    MW->>ISR: render(siteId, /about)
    ISR->>R: get published block tree cache
    alt cache miss
      ISR->>DB: load Page + PageVersion(published) + blocks
      ISR->>R: cache rendered tree
    end
    ISR-->>CDN: HTML + Cache-Control / revalidate tag
    CDN-->>V: HTML (then cached at edge)
  end
```

---

## 5. Multi-Tenancy Strategy

easy-cms uses a **shared database, shared schema** model with **row-level tenant scoping**. This is the simplest operationally for the target scale (many small tenants) and integrates cleanly with Prisma.

### 5.1 Tenancy hierarchy

```mermaid
graph LR
  Org[Organization - tenant root] --> Site1[Site]
  Org --> Site2[Site]
  Site1 --> Page[Page]
  Site1 --> Collection[Collection]
  Site1 --> Media[Media]
  Org --> Membership[Membership - user+role]
  Org --> Subscription[Subscription]
```

- **Organization** is the billing & isolation root (the "tenant").
- **Site** belongs to exactly one Organization; almost every content row carries `siteId`.
- Org-level resources (members, billing, shared templates/themes) carry `orgId`.

### 5.2 Isolation enforcement (defense in depth)

1. **Middleware tenant resolution** — every request resolves a tenant context (`orgId`, and for delivery plane `siteId`) before reaching handlers.
2. **Data-Access Layer (DAL)** — *no handler queries Prisma directly*. All reads/writes go through repository functions that **require** an explicit tenant scope argument and inject `WHERE orgId = ?` / `WHERE siteId = ?`.
3. **PostgreSQL Row-Level Security (RLS)** — optional second layer: a per-request `SET app.current_org_id` with RLS policies on tenant tables, so a missing scope in code cannot leak data.
4. **Authorization** — RBAC checks (see [08-auth-architecture.md](./08-auth-architecture.md)) ensure the caller's membership grants access to the resolved tenant.

```mermaid
graph TB
  Req[Incoming request] --> MW[Tenant + Auth middleware]
  MW --> Ctx[TenantContext orgId/siteId/role]
  Ctx --> Handler
  Handler --> DAL[DAL repositories]
  DAL -->|scoped query| PG[(PostgreSQL + RLS)]
```

### 5.3 Tenant resolution by domain / subdomain

The Next.js middleware classifies the incoming `Host`:

| Host pattern | Plane | Resolution |
|---|---|---|
| `app.easy-cms.com` | Control plane | session → user → active org |
| `*.easy-cms.com` (e.g. `acme.easy-cms.com`) | Delivery plane | subdomain → `Site.subdomain` |
| Custom domain (e.g. `acme.com`) | Delivery plane | `Domain.hostname` lookup → `siteId` |

Domain → `siteId` mappings are cached in Redis (`domain:{host} -> siteId`) with a short TTL and explicit invalidation on domain change, so resolution is a single fast lookup at the edge.

---

## 6. Rendering Strategy

| Surface | Strategy | Why |
|---|---|---|
| Published site pages | **SSG + ISR** (`generateStaticParams` + `revalidate` + on-demand `revalidateTag`) | Fastest, cacheable, cheap |
| Published dynamic CMS listing/detail | **ISR** keyed by collection record updates | Fresh but cacheable |
| Builder/editor canvas | **Dynamic (client-rendered + RSC data)** | Needs live, per-edit state |
| Dashboard | **Dynamic / RSC** | Per-user, per-org data |
| Public APIs (REST/GraphQL) | **Dynamic route handlers** with Redis caching | Read-heavy, cache-friendly |

**Publish → invalidate flow:** when an editor publishes a page, the app writes a new `PageVersion(status=published)`, then calls `revalidateTag('site:{siteId}:page:{pageId}')` and purges the CDN/edge cache for affected URLs. Background jobs may pre-render high-traffic pages.

```mermaid
graph LR
  Pub[Editor clicks Publish] --> Ver[Write PageVersion published]
  Ver --> Tag[revalidateTag site/page]
  Tag --> Purge[CDN purge URL]
  Ver --> Hook[Enqueue publish webhook]
```

---

## 7. Caching Layers

| Layer | Tech | Contents | Invalidation |
|---|---|---|---|
| Edge/CDN | Vercel/Cloudflare | Rendered published HTML, static assets | ISR revalidate + tag purge on publish |
| Application data cache | Redis | Domain→site map, theme tokens, published block trees, API responses | Key delete on write |
| Session / rate-limit | Redis | Better Auth sessions (optional), rate-limit counters | TTL |
| Image CDN | R2/S3 + image optimizer | Responsive image variants | Content-addressed (immutable) |

Cache keys are always tenant-prefixed (`org:{orgId}:...`, `site:{siteId}:...`) so isolation extends to the cache.

---

## 8. Background Jobs

Implemented with **BullMQ on Redis**. Workers run as a separate process (same image, different entrypoint).

| Queue | Jobs |
|---|---|
| `publish` | Pre-render pages, warm CDN, generate sitemap |
| `media` | Image optimization, responsive variants, virus scan |
| `webhooks` | Deliver webhooks with retries + backoff |
| `email` | Verification, password reset, form notifications |
| `billing` | Reconcile Stripe usage, dunning |
| `ai` | Async AI generation (long blog drafts), usage metering |
| `domains` | ACME TLS issuance/renewal, DNS verification |

```mermaid
graph LR
  App[App server] -->|enqueue| Redis[(Redis / BullMQ)]
  Redis --> Worker[Worker process]
  Worker --> PG[(PostgreSQL)]
  Worker --> R2[(R2 / S3)]
  Worker --> Ext[Stripe / ACME / Claude / SMTP]
```

---

## 9. Technology Mapping

| Concern | Technology |
|---|---|
| Framework | Next.js 15 App Router, React 19, TypeScript |
| Styling/UI | TailwindCSS, shadcn/ui (in `packages/ui`) |
| Data | PostgreSQL + Prisma (`packages/db`) |
| Auth | Better Auth |
| Storage | S3 / Cloudflare R2 |
| Editor | dnd-kit (drag), Tiptap (rich text), Zustand (state) |
| Validation | Zod (shared schemas) |
| Cache/Queue | Redis + BullMQ |
| Billing | Stripe |
| AI | Anthropic Claude API (`claude-opus-4-8`, `claude-sonnet-4-6`) |
| Deploy | Docker, Vercel, Railway |

See the remaining documents for deep dives: [03-database-schema.md](./03-database-schema.md), [04-api-design.md](./04-api-design.md), [06-builder-architecture.md](./06-builder-architecture.md), [07-cms-architecture.md](./07-cms-architecture.md).
