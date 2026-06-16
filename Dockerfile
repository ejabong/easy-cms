# ── Production image for apps/web (Next.js standalone) ──────────────────────
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile || pnpm install

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @easy-cms/db generate
RUN pnpm --filter @easy-cms/web build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@easy-cms/web", "start"]
