# easy-cms — Authentication & Authorization Architecture

> Document 08 of the easy-cms documentation set. See [README](./README.md) for the full index.

This document describes how **easy-cms** authenticates users and authorizes their actions. Authentication is handled by **[Better Auth](https://www.better-auth.com/)** backed by PostgreSQL/Prisma; authorization is a two-tier model combining a platform-level role with per-tenant (organization) membership roles enforced by a permission registry and server-side guards.

It builds on the multi-tenant, row-level-isolation model from [System Architecture](./02-architecture.md), the data model in [Database Schema](./03-database-schema.md), and the API surface in [API Design](./04-api-design.md). Threat modeling and hardening are covered in [Security](./09-security.md).

---

## 1. Better Auth Setup

Authentication is configured once on the server in `apps/web/src/lib/auth.ts`. It uses the Prisma adapter (PostgreSQL), email/password with mandatory verification, conditionally enabled social providers, and cookie sessions.

```ts
// apps/web/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  socialProviders: {
    // each provider is enabled only when its client id is present in env
    ...(process.env.GOOGLE_CLIENT_ID && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    }),
    ...(process.env.GITHUB_CLIENT_ID && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    }),
    ...(process.env.FACEBOOK_CLIENT_ID && {
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      },
    }),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the session at most once per day
  },
});

// Strongly-typed session inferred from the configured auth instance.
export type Session = typeof auth.$Infer.Session;
```

Two companion files complete the wiring:

- **Route handler** — `apps/web/src/app/api/auth/[...all]/route.ts` mounts Better Auth's catch-all handler, exposing every auth endpoint (sign-up, sign-in, verify, reset, OAuth callbacks, sign-out) under `/api/auth/*`.
- **Client** — `apps/web/src/lib/auth-client.ts` exports the typed Better Auth client used by React components for `signUp`, `signIn`, `signOut`, social sign-in, and session hooks.

Social providers are **conditionally enabled**: a provider only appears (and its button only renders) when its client id is configured in the environment, so a deployment without GitHub credentials simply omits GitHub sign-in.

---

## 2. Data Model

Better Auth's tables are mapped to Prisma models (see [Database Schema](./03-database-schema.md)):

```prisma
model User {
  id               String       @id @default(cuid())
  email            String       @unique
  name             String?
  image            String?
  emailVerified    Boolean      @default(false)
  platformRole     PlatformRole @default(USER)
  twoFactorEnabled Boolean      @default(false)
}

model Account {
  id         String  @id @default(cuid())
  userId     String
  providerId String  // 'credential' | 'google' | 'github' | 'facebook'
  accountId  String
  password   String? // hashed, only for the 'credential' provider
  // …access/refresh tokens for social providers…

  @@unique([providerId, accountId])
}

model Session {
  id                   String   @id @default(cuid())
  userId               String
  token                String   @unique
  expiresAt            DateTime
  ipAddress            String?
  userAgent            String?
  activeOrganizationId String?  // <- active tenant context
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
}
```

Notes:

- A `User` may have **multiple `Account`s** — e.g. a credential account *and* a linked Google account — disambiguated by `@@unique([providerId, accountId])`. Passwords are hashed and stored only on the `credential` account; social accounts hold OAuth tokens instead.
- `Verification` is a single table reused for **email-verification tokens and password-reset tokens**, keyed by `identifier` with an `expiresAt` TTL.
- `Session.activeOrganizationId` is the linchpin of tenant context (Section 5).

---

## 3. Authentication Flows

### 3.1 Sign-up & email verification

Email/password sign-up creates a `User` (with `emailVerified = false`) and a `credential` `Account`. Because `requireEmailVerification` is `true`, the user cannot establish an authenticated session until they confirm their email via a `Verification` token.

```mermaid
sequenceDiagram
  participant U as User (Browser)
  participant C as auth-client
  participant A as Better Auth (/api/auth/*)
  participant DB as PostgreSQL (Prisma)
  participant M as Email Service

  U->>C: submit email + password
  C->>A: POST /api/auth/sign-up/email
  A->>DB: create User(emailVerified=false) + Account(credential, hashed pw)
  A->>DB: create Verification(identifier=email, value=token, expiresAt)
  A->>M: send verification link (token)
  A-->>C: 200 (verification required)
  M-->>U: email with verify link
  U->>A: GET /api/auth/verify-email?token=…
  A->>DB: lookup Verification, check expiry
  A->>DB: set User.emailVerified = true; delete Verification
  A-->>U: redirect to dashboard (session can now be created)
```

### 3.2 Login

```mermaid
sequenceDiagram
  participant U as User (Browser)
  participant C as auth-client
  participant A as Better Auth (/api/auth/*)
  participant DB as PostgreSQL (Prisma)

  U->>C: submit email + password
  C->>A: POST /api/auth/sign-in/email
  A->>DB: find Account(credential) by email; verify password hash
  alt emailVerified == false
    A-->>U: 403 — verification required
  else valid + verified
    A->>DB: create Session(token, expiresAt=+7d, ip, userAgent)
    A-->>C: Set-Cookie: session token (httpOnly, secure)
    C-->>U: authenticated; redirect to dashboard
  end
```

### 3.3 Password reset

1. User requests a reset; Better Auth creates a `Verification` token keyed by the email and emails a reset link.
2. User opens the link and submits a new password.
3. The token is validated against `Verification` (and its `expiresAt`), the `credential` account password hash is updated, and the token is consumed. Existing sessions may be invalidated for safety.

### 3.4 Social OAuth

For Google / GitHub / Facebook, the client calls `signIn.social({ provider })`, which redirects to the provider; the provider redirects back to the Better Auth callback under `/api/auth/*`. Better Auth upserts the `User`, links a social `Account` (storing OAuth tokens), and creates a `Session`. Email from a verified OAuth provider is treated as verified.

---

## 4. Sessions

Sessions are **cookie-based**, server-validated, and stored in the `Session` table.

| Property | Value | Purpose |
|---|---|---|
| Transport | `httpOnly`, `secure` cookie holding `Session.token` | Not readable by JS; mitigates XSS token theft. |
| `expiresIn` | 7 days | Absolute session lifetime. |
| `updateAge` | 1 day | Sliding refresh — the session's expiry is extended at most once per day on activity, avoiding a write on every request. |
| `ipAddress` / `userAgent` | Captured at creation | Auditing and anomaly detection. |
| `activeOrganizationId` | Current tenant | Scopes dashboard queries to the selected org/site. |

The 7-day `expiresIn` combined with a 1-day `updateAge` gives a good balance: active users stay logged in via daily refresh, while idle sessions expire within a week.

---

## 5. Tenant Context (`activeOrganizationId`)

A user can belong to multiple organizations. `Session.activeOrganizationId` records the **last selected** org/site and acts as the ambient tenant for the dashboard. When a user switches workspaces, this field is updated; all subsequent dashboard/control-plane queries are scoped to it. This is the authentication-layer half of the row-level isolation invariant documented in [System Architecture](./02-architecture.md) — every tenant-bound query reads its `organizationId` / `siteId` from this active context and the user's membership.

---

## 6. Two-Factor Authentication (TOTP)

`User.twoFactorEnabled` flags accounts protected by a second factor. The platform integrates Better Auth's **two-factor plugin** for **TOTP** (time-based one-time passwords, RFC 6238) — compatible with authenticator apps such as Google Authenticator, 1Password, and Authy. *(Status: planned / optional — gated behind the `twoFactorEnabled` flag.)*

Flow outline:

1. **Enrollment** — the user requests 2FA setup; the server generates a TOTP secret and returns an `otpauth://` URI rendered as a QR code, plus one-time backup codes.
2. **Activation** — the user submits a current TOTP code to confirm enrollment; `twoFactorEnabled` is set to `true`.
3. **Login challenge** — when `twoFactorEnabled` is `true`, after password verification Better Auth issues a pending challenge and requires a valid TOTP (or backup) code before a full `Session` is created.

---

## 7. Authorization Model

easy-cms authorization is **two-tier**:

1. **Platform role** (`User.platformRole`) — global standing on the SaaS platform.
2. **Organization role** (`Membership.role`) — the user's role *within a specific tenant*.

```prisma
enum PlatformRole {
  SUPER_ADMIN // platform operator — global bypass
  USER        // ordinary user
}

enum Role {
  ADMIN   // full control within an organization
  EDITOR
  AUTHOR
  MEMBER  // read-only
}
```

A user's effective capability inside a given organization is determined by their `Membership.role` for that org — **except** when their `platformRole` is `SUPER_ADMIN`, in which case they bypass membership checks entirely and are treated as `ADMIN` everywhere (used by platform operators for support and administration). This bypass is the single most privileged path in the system and is therefore audited; see [Security](./09-security.md).

### 7.1 Permission registry (`packages/core/src/rbac.ts`)

Permissions are fine-grained string constants; roles map to sets of them.

```ts
export const PERMISSIONS = [
  "site:create", "site:edit", "site:delete", "site:publish",
  "page:create", "page:edit", "page:publish",
  "content:create", "content:edit", "content:publish",
  "media:upload", "media:delete",
  "form:manage", "user:manage", "billing:manage",
  "template:manage", "settings:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...PERMISSIONS], // all permissions
  EDITOR: [
    "site:edit", "site:publish",
    "page:create", "page:edit", "page:publish",
    "content:create", "content:edit", "content:publish",
    "media:upload", "media:delete",
    "form:manage",
  ],
  AUTHOR: [
    "page:create", "page:edit",
    "content:create", "content:edit",
    "media:upload",
  ],
  MEMBER: [], // read-only
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export const RANK: Record<Role, number> = { ADMIN: 3, EDITOR: 2, AUTHOR: 1, MEMBER: 0 };

export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}
```

`atLeast` supports hierarchy checks (e.g. "this action needs at least `EDITOR`") independent of the granular permission map.

### 7.2 Role × permission matrix

The following matrix is the canonical authority — it mirrors `ROLE_PERMISSIONS` exactly. `ADMIN` holds every permission; `MEMBER` holds none (read-only).

| Permission | ADMIN | EDITOR | AUTHOR | MEMBER |
|---|:---:|:---:|:---:|:---:|
| `site:create`     | ✅ | — | — | — |
| `site:edit`       | ✅ | ✅ | — | — |
| `site:delete`     | ✅ | — | — | — |
| `site:publish`    | ✅ | ✅ | — | — |
| `page:create`     | ✅ | ✅ | ✅ | — |
| `page:edit`       | ✅ | ✅ | ✅ | — |
| `page:publish`    | ✅ | ✅ | — | — |
| `content:create`  | ✅ | ✅ | ✅ | — |
| `content:edit`    | ✅ | ✅ | ✅ | — |
| `content:publish` | ✅ | ✅ | — | — |
| `media:upload`    | ✅ | ✅ | ✅ | — |
| `media:delete`    | ✅ | ✅ | — | — |
| `form:manage`     | ✅ | ✅ | — | — |
| `user:manage`     | ✅ | — | — | — |
| `billing:manage`  | ✅ | — | — | — |
| `template:manage` | ✅ | — | — | — |
| `settings:manage` | ✅ | — | — | — |

Summary: **ADMIN** = all 17; **EDITOR** = 11 (site edit/publish, all page perms, all content perms, both media perms, form:manage); **AUTHOR** = 5 (page create/edit, content create/edit, media:upload); **MEMBER** = 0.

---

## 8. Server-Side Guards (`apps/web/src/lib/guards.ts`)

Authorization is enforced **server-side** in every server action and route handler via two guards. The client never decides access; UI affordances are convenience only.

```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { can, type Permission } from "@easy-cms/core/rbac";

/** Require an authenticated session, or redirect to /login. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/** Require a permission within a specific organization. */
export async function requirePermission(organizationId: string, permission: Permission) {
  const session = await requireSession();

  // SUPER_ADMIN bypasses membership and is treated as ADMIN everywhere.
  if (session.user.platformRole === "SUPER_ADMIN") {
    return { session, role: "ADMIN" as const };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId } },
  });

  if (!membership || !can(membership.role, permission)) {
    throw new Error("Forbidden");
  }

  return { session, role: membership.role };
}
```

### 8.1 Calling the guards

**Server action** (control-plane mutation):

```ts
"use server";
export async function publishPage(orgId: string, pageId: string) {
  const { session } = await requirePermission(orgId, "page:publish");
  // …perform the publish, scoped by orgId/siteId…
}
```

**Route handler** (API):

```ts
export async function POST(req: Request) {
  const { orgId, ...input } = await req.json();
  await requirePermission(orgId, "content:create"); // throws Forbidden -> 403
  // …create the record, scoped to the tenant…
}
```

`requireSession` answers *"who are you?"*; `requirePermission` answers *"may you do this, here?"*. The `organizationId` argument ties every permission check to a specific tenant, so a user with `EDITOR` in org A gains nothing in org B.

---

## 9. Defense in Depth

Authorization is one layer among several. easy-cms combines:

- **Authentication** — verified identity via Better Auth (Sections 1–4), with optional TOTP 2FA.
- **Authorization** — the two-tier RBAC model and server guards above, enforced on every mutation.
- **Tenant isolation** — row-level scoping by `organizationId` / `siteId`, with `activeOrganizationId` providing the ambient tenant context. Even an authenticated, authorized request can only touch rows belonging to its tenant. See [System Architecture](./02-architecture.md).
- **Input validation** — Zod-validated payloads (including the dynamic CMS schemas in [Headless CMS Architecture](./07-cms-architecture.md)).
- **Transport & storage hardening** — httpOnly/secure cookies, hashed passwords, token TTLs, and auditing of the `SUPER_ADMIN` bypass.

For the full threat model, rate limiting, sanitization, and secrets management, see [Security](./09-security.md).

---

## 10. Summary

- Better Auth (Prisma/PostgreSQL) provides email/password with mandatory verification, password reset, and conditionally enabled Google/GitHub/Facebook OAuth.
- Sessions are httpOnly cookies with a 7-day lifetime and 1-day sliding refresh; `Session.activeOrganizationId` carries tenant context.
- Authorization is two-tier: `PlatformRole` (`SUPER_ADMIN` bypass) plus per-org `Membership.role` (`ADMIN`/`EDITOR`/`AUTHOR`/`MEMBER`).
- A permission registry maps 17 permissions to roles; `can`, `permissionsFor`, and `atLeast` express checks.
- `requireSession` and `requirePermission` enforce access server-side in every action and route handler.
- TOTP 2FA is available behind `User.twoFactorEnabled`.
