# easy-cms — Deployment

> Document 10 of the easy-cms documentation set. See [README](./README.md) for the full index.

This document describes how **easy-cms** is built, packaged, configured, and deployed: the production topology, the multi-stage Docker image, the local Compose stack, hosting options, the full environment-variable inventory, CI/CD, database migration strategy, custom-domain SSL, and zero-downtime release practices.

Related reading: [System Architecture](./02-architecture.md) · [Database Schema](./03-database-schema.md) · [Security](./09-security.md) · [Billing](./13-billing.md).

---

## 1. Deployment Overview & Topology

easy-cms runs as a small set of **stateless** application processes backed by managed stateful services. The web app is built with Next.js 15 in **standalone** output mode (a self-contained server bundle), and a **separate worker process** runs background jobs (BullMQ) from the same image. State lives in PostgreSQL, Redis, and object storage; published-site delivery is fronted by a CDN/edge.

```mermaid
graph TB
  Visitor[Visitor / Editor / API consumer]

  subgraph Edge["CDN / Edge"]
    CDN[CDN cache + edge middleware + SSL]
  end

  subgraph Compute["Stateless Compute"]
    Web[Next.js standalone server :3000]
    Worker[BullMQ worker process - separate entrypoint]
  end

  subgraph State["Managed Stateful Services"]
    PG[(PostgreSQL)]
    Redis[(Redis - cache + queues)]
    Obj[(Object Storage - S3 / R2)]
  end

  Visitor --> CDN --> Web
  Web --> PG
  Web --> Redis
  Web --> Obj
  Worker --> PG
  Worker --> Redis
  Worker --> Obj
  CDN -. cached HTML / assets .-> Obj
```

The web server and the worker share **one image** but use different entrypoints — see [02 — Architecture](./02-architecture.md) for the control-plane / delivery-plane split and the job pipeline.

---

## 2. The Docker Image (multi-stage)

The `Dockerfile` is a multi-stage build that produces a lean production runner. Stages are ordered to maximize layer caching (dependencies change less often than source).

```dockerfile
# 1) base — toolchain
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 2) deps — install workspace dependencies (cacheable)
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile

# 3) build — generate Prisma client and build the web app
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @easy-cms/db generate
RUN pnpm --filter @easy-cms/web build

# 4) runner — minimal production image
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@easy-cms/web", "start"]
```

| Stage | Purpose |
|---|---|
| `base` | Pins `node:22-alpine`, enables **corepack** and pnpm — the shared toolchain. |
| `deps` | Copies only the workspace manifests + lockfile and runs `pnpm install --frozen-lockfile`. Isolating this means dependency layers are reused until a manifest changes. |
| `build` | Copies all source, generates the Prisma client (`pnpm --filter @easy-cms/db generate`), then builds the app (`pnpm --filter @easy-cms/web build`) into Next.js standalone output. |
| `runner` | Sets `NODE_ENV=production`, exposes `3000`, and starts the web server (`pnpm --filter @easy-cms/web start`). |

### 2.1 Reusing the image for the worker

The worker container **reuses the exact same image** — only the command changes. The worker has its own entrypoint (the BullMQ consumer), so deployment simply runs the image with an overridden command:

```yaml
# example: same image, worker command
worker:
  image: easy-cms:latest
  command: ["pnpm", "--filter", "@easy-cms/web", "worker"]
  environment: [ ... same env as web ... ]
```

This guarantees web and worker run identical code and dependencies, eliminating drift.

---

## 3. Local Development Stack (docker-compose)

`docker-compose.yml` provisions the **stateful services** for local development; the app itself runs on the host via `pnpm dev` against these services.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: easycms
      POSTGRES_PASSWORD: easycms
      POSTGRES_DB: easycms
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U easycms"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redisdata:/data"]

volumes:
  pgdata:
  redisdata:
```

| Service | Image | Port | Volume | Notes |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | `pgdata` | `pg_isready` healthcheck gates dependent startup. |
| `redis` | `redis:7-alpine` | 6379 | `redisdata` | Cache + BullMQ queues. |

Typical local flow:

```bash
docker compose up -d        # start postgres + redis
pnpm db:generate            # generate Prisma client
pnpm db:push                # sync schema (or db:migrate)
pnpm db:seed                # seed sample tenant/data
pnpm dev                    # run web + worker locally
```

---

## 4. Hosting Options

easy-cms can be deployed in several ways. The image-based options (Railway, AWS) use the Dockerfile directly; Vercel uses its native Next.js build.

| Platform | Best for | App | Postgres | Redis | Trade-offs |
|---|---|---|---|---|---|
| **Vercel** | Next.js-first teams | Native build, edge middleware, ISR | External managed (Neon/Supabase/RDS) | External managed (Upstash) | Best DX for Next.js + edge + ISR; but DB/Redis are external, and long-running BullMQ workers need a separate host. |
| **Railway** | Simplicity | Docker image | Managed PG plugin | Managed Redis plugin | One platform for app + data; easy worker service; less edge/CDN control than Vercel. |
| **AWS** | Scale & control | ECS/Fargate (Docker) | RDS PostgreSQL | ElastiCache Redis | S3 + CloudFront; maximum control and scalability; highest operational complexity. |

### 4.1 Vercel

Deploy the web app natively for first-class App Router, **edge middleware** (host→tenant resolution), and **ISR** for published pages. Point `DATABASE_URL`/`REDIS_URL` at managed providers. Run the BullMQ worker on a separate always-on host (Railway/Fly/ECS) using the same Docker image.

### 4.2 Railway

Build from the `Dockerfile` and add the managed PostgreSQL and Redis plugins. Define two services from one image — `web` (default `CMD`) and `worker` (overridden command). Inject env vars via Railway variables.

### 4.3 AWS (ECS/Fargate)

Push the image to ECR, run **two ECS services** (web + worker) on Fargate, with **RDS** (PostgreSQL), **ElastiCache** (Redis), **S3** (media), and **CloudFront** (CDN + custom-domain certs). Secrets via AWS Secrets Manager / SSM Parameter Store.

---

## 5. Environment Variables

All configuration is supplied via environment variables (placeholders in `.env.example`). Secrets are never committed — see [09 — Security](./09-security.md).

### 5.1 Core

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Runtime mode | `production` |
| `APP_URL` | Yes | Canonical app URL | `https://app.easycms.io` |
| `ROOT_DOMAIN` | Yes | Base domain for tenant subdomains `{slug}.{ROOT_DOMAIN}` | `easycms.io` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL exposed to the client | `https://app.easycms.io` |

### 5.2 Database

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://easycms:pass@host:5432/easycms` |

### 5.3 Redis

| Variable | Required | Description | Example |
|---|---|---|---|
| `REDIS_URL` | Yes | Redis connection string (cache + queues) | `redis://host:6379` |

### 5.4 Auth

| Variable | Required | Description | Example |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | Session signing secret (32+ chars) | `a-32-char-min-random-secret-string` |
| `BETTER_AUTH_URL` | Yes | Better Auth base URL | `https://app.easycms.io` |

### 5.5 Social Login

| Variable | Required | Description | Example |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | No | Google OAuth client id | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret | `GOCSPX-...` |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client id | `Iv1....` |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth client secret | `...` |
| `FACEBOOK_CLIENT_ID` | No | Facebook OAuth app id | `1234567890` |
| `FACEBOOK_CLIENT_SECRET` | No | Facebook OAuth app secret | `...` |

### 5.6 Email

| Variable | Required | Description | Example |
|---|---|---|---|
| `EMAIL_FROM` | Yes | Default sender address | `noreply@easycms.io` |
| `RESEND_API_KEY` | Yes | Resend transactional email API key | `re_...` |

### 5.7 Storage

| Variable | Required | Description | Example |
|---|---|---|---|
| `S3_ENDPOINT` | Yes | S3/R2 endpoint | `https://<acct>.r2.cloudflarestorage.com` |
| `S3_REGION` | No | Region (auto for R2) | `auto` |
| `S3_BUCKET` | Yes | Media bucket | `easycms-media` |
| `S3_ACCESS_KEY_ID` | Yes | Storage access key | `AKIA...` |
| `S3_SECRET_ACCESS_KEY` | Yes | Storage secret key | `...` |
| `S3_PUBLIC_URL` | Yes | Public base URL for media | `https://media.easycms.io` |

### 5.8 Billing

| Variable | Required | Description | Example |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret | `whsec_...` |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (client) | `pk_live_...` |

### 5.9 AI

| Variable | Required | Description | Example |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key | `sk-ant-...` |
| `AI_DEFAULT_MODEL` | No | Default Claude model | `claude-opus-4-8` |

Billing configuration details are in [13 — Billing](./13-billing.md).

---

## 6. Continuous Integration (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests. It mirrors the local toolchain to catch build/type errors before merge.

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm typecheck
      - run: pnpm build
        env:
          DATABASE_URL: postgresql://placeholder
          BETTER_AUTH_SECRET: placeholder-32-characters-minimum-xx
```

| Step | Purpose |
|---|---|
| `pnpm/action-setup@v4` (v10) | Install pnpm 10. |
| `setup-node@v4` (node 22, cache pnpm) | Node 22 with pnpm cache. |
| `pnpm install --frozen-lockfile` | Reproducible install (no lockfile drift). |
| `pnpm db:generate` | Generate Prisma client so types compile. |
| `pnpm typecheck` | TypeScript validation. |
| `pnpm build` | Production build with placeholder env. |

### 6.1 Suggested CD step

A deploy job, gated on a successful build of `main`, runs migrations **before** the new app boots:

```yaml
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm prisma migrate deploy   # release step, before deploy
        env: { DATABASE_URL: ${{ secrets.DATABASE_URL }} }
      - run: ./scripts/deploy.sh          # roll out the new image
```

---

## 7. Database Migrations

Root scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `db:generate`, `db:migrate`, `db:push`, `db:seed`, `db:studio`. (`pnpm@10.9.0`, `node>=20`; Docker uses node 22.)

### 7.1 Dev vs prod

- **Development** — `pnpm db:migrate` (`prisma migrate dev`) to author/apply migrations, or `pnpm db:push` for quick schema sync, then `pnpm db:seed`.
- **Production** — `prisma migrate deploy` runs as a **release step before the app boots**, applying any pending migrations exactly once. It never generates new migrations and never prompts.

### 7.2 Zero-downtime: expand / contract

Schema changes follow the **expand/contract** pattern so old and new app versions can run simultaneously during a rolling release: first **expand** (add nullable columns/tables, backfill), deploy code that writes both shapes, then **contract** (drop the old column) in a later release once no running code depends on it. See [03 — Database Schema](./03-database-schema.md) for the modeling rules.

### 7.3 Release pipeline

```mermaid
flowchart LR
  A[CI: build + typecheck passes on main] --> B[Build & push Docker image]
  B --> C[Run prisma migrate deploy]
  C --> D{Migration ok?}
  D -- no --> E[Halt release / alert]
  D -- yes --> F[Roll out new app + worker instances]
  F --> G[Health checks: /api/health]
  G --> H{Healthy?}
  H -- no --> I[Rollback to previous image]
  H -- yes --> J[Shift traffic / retire old instances]
```

---

## 8. Wildcard & Custom Domain SSL

### 8.1 Platform subdomains

Tenants are served at `{slug}.{ROOT_DOMAIN}`. A single **wildcard certificate** for `*.{ROOT_DOMAIN}` covers all tenant subdomains, and a wildcard DNS record points them at the app/CDN. Middleware reads the `Host` header and **rewrites** the request to the resolved tenant (see [02 — Architecture](./02-architecture.md) and [09 — Security](./09-security.md)).

### 8.2 Per-customer custom domains

Customers can attach their own domain (e.g. `www.acme.com`). The `Domain` model tracks the lifecycle:

| Field | Description |
|---|---|
| `hostname` | The customer's domain |
| `verificationToken` | Token the customer adds as a DNS record |
| `status` | `pending` → `verifying` → `active` (or `failed`) |
| `sslIssued` | Whether a certificate has been issued |

Flow:

1. Customer enters `hostname`; we generate a `verificationToken`.
2. Customer adds the DNS record (TXT/CNAME) at their registrar.
3. We verify ownership via DNS lookup; `status` advances.
4. A certificate is issued via **ACME / Let's Encrypt**; `sslIssued = true`.
5. The CDN/edge manages certificate storage and renewal; the host now resolves to the correct tenant.

```mermaid
sequenceDiagram
  participant C as Customer
  participant E as easy-cms
  participant DNS
  participant ACME as ACME / Let's Encrypt
  C->>E: Add custom domain
  E-->>C: verificationToken + DNS instructions
  C->>DNS: Create verification + CNAME records
  E->>DNS: Verify ownership
  E->>ACME: Request certificate
  ACME-->>E: Issued cert (sslIssued=true)
  E-->>C: Domain active (HTTPS)
```

---

## 9. Zero-Downtime Deployment

- **Rolling or blue-green** — new instances start and pass health checks before old instances are retired; traffic shifts only to healthy instances.
- **Health endpoint** — `GET /api/health` checks DB and Redis connectivity; the orchestrator uses it for liveness/readiness.
- **Readiness gate** — an instance is added to the pool only after `/api/health` returns healthy.
- **Graceful worker shutdown** — on `SIGTERM`, BullMQ workers stop accepting new jobs, finish in-flight jobs (within a drain timeout), then exit, so no job is lost mid-deploy.
- **Migration ordering** — `prisma migrate deploy` runs before new instances boot; expand/contract keeps the schema compatible with both old and new code during the rollout.

---

## 10. Production Checklist

- [ ] All required secrets set in the production secret store (none committed).
- [ ] `BETTER_AUTH_SECRET` is 32+ chars and unique to the environment.
- [ ] `prisma migrate deploy` runs as a release step; migrations applied.
- [ ] Database backups + point-in-time recovery enabled.
- [ ] Monitoring, logging, and alerting wired up (app + worker).
- [ ] Rate limits configured in Redis (see [09 — Security](./09-security.md)).
- [ ] Stripe webhook endpoint configured with correct `STRIPE_WEBHOOK_SECRET` (see [13 — Billing](./13-billing.md)).
- [ ] `ROOT_DOMAIN` set; wildcard DNS + `*.ROOT_DOMAIN` cert in place.
- [ ] Custom-domain verification + ACME issuance pipeline operational.
- [ ] Object storage bucket created with correct CORS for `S3_PUBLIC_URL`.
- [ ] `/api/health` returns healthy; readiness/liveness probes configured.
- [ ] Worker service deployed from the same image with graceful shutdown.
- [ ] CDN/edge caching + SSL configured for published sites.

---

_See also: [02 — Architecture](./02-architecture.md) · [03 — Database Schema](./03-database-schema.md) · [09 — Security](./09-security.md) · [13 — Billing](./13-billing.md)._
