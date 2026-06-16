# easy-cms — API Design

> Document 04 of the easy-cms documentation set. See [README](./README.md) for the full index.

This document specifies the **API surface** for **easy-cms**. There are three distinct interfaces:

1. **Control-plane REST API** (`/api/v1`) — the authenticated dashboard/editor API. Session-cookie auth via Better Auth, organization context resolved from the active org / path, RBAC-gated per route.
2. **Public Content Delivery API** (`/api/public/v1`) — read-only, published-content-only delivery for headless consumers. Authenticated by API key, tenant-scoped to the key's organization.
3. **GraphQL read API** — an alternative read surface over the same published content.

All three sit behind the edge/middleware described in [02-architecture.md](./02-architecture.md), persist through the models in [03-database-schema.md](./03-database-schema.md), and enforce the auth/RBAC model in [08-auth-architecture.md](./08-auth-architecture.md). Security controls (input validation, CSRF, secret handling) are detailed in [09-security.md](./09-security.md).

---

## 1. Conventions

| Concern | Convention |
|---|---|
| Control-plane base | `/api/v1` |
| Public delivery base | `/api/public/v1` |
| Dashboard auth | Better Auth **session cookie**; org context from active org / path |
| Public auth | **`Authorization: Bearer <apiKey>`** (API key) |
| Content type | `application/json` (uploads use multipart/presigned) |
| IDs | `cuid()` strings |
| Timestamps | ISO-8601 UTC |
| Versioning | URL-prefixed (`/v1`) |
| Idempotency | mutating POSTs accept `Idempotency-Key` header |

### 1.1 RBAC permission strings

Routes are gated by **permission strings** mapped to roles (`ADMIN`, `EDITOR`, `AUTHOR`, `MEMBER`). `SUPER_ADMIN` (platform role) **bypasses** all checks. Full role→permission matrix lives in [08-auth-architecture.md](./08-auth-architecture.md).

`site:create` · `site:edit` · `site:delete` · `site:publish` · `page:create` · `page:edit` · `page:publish` · `content:create` · `content:edit` · `content:publish` · `media:upload` · `media:delete` · `form:manage` · `user:manage` · `billing:manage` · `template:manage` · `settings:manage`

---

## 2. Control-Plane REST Resources

All paths are relative to `/api/v1`. **Auth** is `session` (Better Auth cookie) for every route below; the **Permission** column lists the required RBAC string. Resources are implicitly scoped to the active organization; site-scoped resources additionally validate that `{siteId}` belongs to that org.

### 2.1 Organizations, Members, Invitations

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/organizations` | session | — | List orgs the user is a member of |
| POST | `/organizations` | session | — | Create an organization (creator becomes owner/ADMIN) |
| GET | `/organizations/{orgId}` | session | — (member) | Get org details |
| PATCH | `/organizations/{orgId}` | session | `settings:manage` | Update org name/slug/settings |
| DELETE | `/organizations/{orgId}` | session | `settings:manage` | Delete org (owner only) |
| GET | `/organizations/{orgId}/members` | session | `user:manage` | List memberships |
| PATCH | `/organizations/{orgId}/members/{userId}` | session | `user:manage` | Change a member's role |
| DELETE | `/organizations/{orgId}/members/{userId}` | session | `user:manage` | Remove a member |
| GET | `/organizations/{orgId}/invitations` | session | `user:manage` | List pending invitations |
| POST | `/organizations/{orgId}/invitations` | session | `user:manage` | Invite by email + role |
| POST | `/invitations/{token}/accept` | session | — | Accept an invitation |
| DELETE | `/invitations/{id}` | session | `user:manage` | Revoke an invitation |

### 2.2 Sites & Domains

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/sites` | session | — (member) | List sites in active org |
| POST | `/sites` | session | `site:create` | Create a site |
| GET | `/sites/{siteId}` | session | — (member) | Get site |
| PATCH | `/sites/{siteId}` | session | `site:edit` | Update site settings/`socialLinks` |
| DELETE | `/sites/{siteId}` | session | `site:delete` | Delete site |
| POST | `/sites/{siteId}/publish` | session | `site:publish` | Publish/transition site status |
| GET | `/sites/{siteId}/domains` | session | `settings:manage` | List domains |
| POST | `/sites/{siteId}/domains` | session | `settings:manage` | Attach a custom domain |
| POST | `/domains/{domainId}/verify` | session | `settings:manage` | Trigger DNS/TLS verification |
| DELETE | `/domains/{domainId}` | session | `settings:manage` | Detach a domain |
| GET | `/sites/{siteId}/redirects` | session | `settings:manage` | List redirects |
| POST | `/sites/{siteId}/redirects` | session | `settings:manage` | Create a redirect rule |
| DELETE | `/redirects/{id}` | session | `settings:manage` | Delete a redirect |

### 2.3 Pages, Versions & Publishing

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/sites/{siteId}/pages` | session | — (member) | List pages |
| POST | `/sites/{siteId}/pages` | session | `page:create` | Create a page |
| GET | `/pages/{pageId}` | session | — (member) | Get page + current block tree |
| PATCH | `/pages/{pageId}` | session | `page:edit` | Update page `content`/`seo`/meta |
| DELETE | `/pages/{pageId}` | session | `page:edit` | Delete page |
| GET | `/pages/{pageId}/versions` | session | — (member) | List `PageVersion` history |
| GET | `/pages/{pageId}/versions/{version}` | session | — (member) | Get a snapshot |
| POST | `/pages/{pageId}/versions/{version}/restore` | session | `page:edit` | Restore a version into draft |
| POST | `/pages/{pageId}/publish` | session | `page:publish` | Publish page → new published `PageVersion` |
| GET | `/sites/{siteId}/reusable-blocks` | session | — (member) | List reusable blocks |
| POST | `/sites/{siteId}/reusable-blocks` | session | `page:edit` | Create a reusable block |

### 2.4 Collections, Fields & Records (CMS)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/sites/{siteId}/collections` | session | — (member) | List collections |
| POST | `/sites/{siteId}/collections` | session | `settings:manage` | Create a collection (content type) |
| PATCH | `/collections/{collectionId}` | session | `settings:manage` | Rename/configure a collection |
| DELETE | `/collections/{collectionId}` | session | `settings:manage` | Delete a collection |
| GET | `/collections/{collectionId}/fields` | session | — (member) | List fields (schema) |
| POST | `/collections/{collectionId}/fields` | session | `settings:manage` | Add a field |
| PATCH | `/fields/{fieldId}` | session | `settings:manage` | Update a field's `config`/type |
| DELETE | `/fields/{fieldId}` | session | `settings:manage` | Remove a field |
| GET | `/collections/{collectionId}/records` | session | — (member) | List records (filter by status) |
| POST | `/collections/{collectionId}/records` | session | `content:create` | Create a record |
| GET | `/records/{recordId}` | session | — (member) | Get a record |
| PATCH | `/records/{recordId}` | session | `content:edit` | Update record `data` |
| POST | `/records/{recordId}/publish` | session | `content:publish` | Publish a record |
| DELETE | `/records/{recordId}` | session | `content:edit` | Delete a record |

### 2.5 Blog: Posts, Categories & Tags

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/sites/{siteId}/posts` | session | — (member) | List posts |
| POST | `/sites/{siteId}/posts` | session | `content:create` | Create a post (Tiptap content) |
| GET | `/posts/{postId}` | session | — (member) | Get a post |
| PATCH | `/posts/{postId}` | session | `content:edit` | Update a post |
| POST | `/posts/{postId}/publish` | session | `content:publish` | Publish a post |
| DELETE | `/posts/{postId}` | session | `content:edit` | Delete a post |
| GET | `/sites/{siteId}/categories` | session | — (member) | List categories |
| POST | `/sites/{siteId}/categories` | session | `content:edit` | Create a category |
| GET | `/sites/{siteId}/tags` | session | — (member) | List tags |
| POST | `/sites/{siteId}/tags` | session | `content:edit` | Create a tag |

### 2.6 Media & Folders

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/sites/{siteId}/media` | session | — (member) | List media (filter by folder) |
| POST | `/sites/{siteId}/media/upload-url` | session | `media:upload` | Get a presigned S3/R2 upload URL |
| POST | `/sites/{siteId}/media` | session | `media:upload` | Finalize a media record post-upload |
| DELETE | `/media/{mediaId}` | session | `media:delete` | Delete a media asset |
| GET | `/sites/{siteId}/media-folders` | session | — (member) | List folder tree |
| POST | `/sites/{siteId}/media-folders` | session | `media:upload` | Create a folder |
| DELETE | `/media-folders/{folderId}` | session | `media:delete` | Delete a folder |

### 2.7 Forms & Submissions

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/sites/{siteId}/forms` | session | `form:manage` | List forms |
| POST | `/sites/{siteId}/forms` | session | `form:manage` | Create a form |
| PATCH | `/forms/{formId}` | session | `form:manage` | Update form (`notifyEmails`) |
| DELETE | `/forms/{formId}` | session | `form:manage` | Delete a form |
| GET | `/forms/{formId}/fields` | session | `form:manage` | List form fields |
| POST | `/forms/{formId}/fields` | session | `form:manage` | Add a field |
| DELETE | `/form-fields/{fieldId}` | session | `form:manage` | Remove a field |
| GET | `/forms/{formId}/submissions` | session | `form:manage` | List submissions |
| GET | `/form-submissions/{id}` | session | `form:manage` | Get a submission |

> Public form submission (`POST`) is unauthenticated from the published site renderer and protected by per-IP rate limiting + spam scoring; it is **not** part of the credentialed API.

### 2.8 Templates, Billing, API Keys & Webhooks

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/templates` | session | — (member) | Browse templates (org + global marketplace) |
| POST | `/templates` | session | `template:manage` | Create an org template |
| POST | `/templates/{templateId}/versions` | session | `template:manage` | Publish a template version |
| GET | `/billing/plans` | session | — | List plan catalog |
| GET | `/billing/subscription` | session | `billing:manage` | Get active subscription |
| POST | `/billing/checkout` | session | `billing:manage` | Create Stripe Checkout session |
| POST | `/billing/portal` | session | `billing:manage` | Open Stripe billing portal |
| GET | `/api-keys` | session | `settings:manage` | List API keys (prefix only) |
| POST | `/api-keys` | session | `settings:manage` | Create a key (returns full key once) |
| POST | `/api-keys/{id}/rotate` | session | `settings:manage` | Rotate a key |
| DELETE | `/api-keys/{id}` | session | `settings:manage` | Revoke a key |
| GET | `/sites/{siteId}/webhooks` | session | `settings:manage` | List webhooks |
| POST | `/sites/{siteId}/webhooks` | session | `settings:manage` | Create a webhook |
| DELETE | `/webhooks/{id}` | session | `settings:manage` | Delete a webhook |

---

## 3. Public Content Delivery API

Base path `/api/public/v1`. **Read-only**, returns **published content only**, and is scoped to the organization that owns the API key. Responses are cacheable and served through ISR/CDN (see [02-architecture.md §6](./02-architecture.md)).

```http
GET /api/public/v1/sites/{siteId}/pages?limit=20
Authorization: Bearer ek_live_a1b2c3d4e5f6...
```

### 3.1 Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/sites/{siteId}/pages` | List published pages |
| GET | `/sites/{siteId}/pages/{slug}` | Get a published page by slug |
| GET | `/sites/{siteId}/collections` | List collections |
| GET | `/sites/{siteId}/collections/{slug}/records` | List published records |
| GET | `/sites/{siteId}/collections/{slug}/records/{recordId}` | Get a published record |
| GET | `/sites/{siteId}/posts` | List published posts |
| GET | `/sites/{siteId}/posts/{slug}` | Get a published post |
| GET | `/sites/{siteId}/categories` | List categories |
| GET | `/sites/{siteId}/tags` | List tags |

The key's `scopes` (e.g. `content:read`, `pages:read`) further restrict which resource families are reachable; a key without `posts:read` receives `403` on blog endpoints.

### 3.2 Example responses

Get a published page:

```json
{
  "data": {
    "id": "clp9a1b2c3",
    "slug": "about",
    "title": "About Us",
    "type": "ABOUT",
    "content": [
      { "id": "blk_1", "type": "hero", "props": { "heading": "We build the web" } },
      { "id": "blk_2", "type": "richText", "props": { "html": "<p>…</p>" } }
    ],
    "seo": { "title": "About Us | Acme", "description": "Who we are." },
    "publishedAt": "2026-05-30T12:00:00Z"
  },
  "requestId": "req_8f3a91"
}
```

List published records (paginated envelope):

```json
{
  "data": [
    { "id": "rec_01", "data": { "name": "Espresso", "priceCents": 350 }, "publishedAt": "2026-06-01T09:00:00Z" },
    { "id": "rec_02", "data": { "name": "Latte", "priceCents": 450 }, "publishedAt": "2026-06-01T09:01:00Z" }
  ],
  "pageInfo": { "nextCursor": "rec_02", "hasNextPage": true },
  "requestId": "req_a17c20"
}
```

### 3.3 Caching

Delivery responses set `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` and an `ETag`. The CDN keys cache on path + `siteId`. On publish, the app issues `revalidateTag('site:{siteId}:…')` and purges affected URLs, so changes propagate without waiting for TTL expiry.

---

## 4. GraphQL Read API

A single read-only GraphQL endpoint complements the Content Delivery API for consumers that want to select fields and traverse relations in one round-trip. Same API-key auth, same published-only / tenant-scoped semantics.

```graphql
scalar JSON
scalar DateTime

type Site {
  id: ID!
  name: String!
  subdomain: String!
  pages(first: Int = 20, after: String): PageConnection!
  collections: [Collection!]!
  posts(first: Int = 20, after: String, category: String): PostConnection!
}

type Page {
  id: ID!
  slug: String!
  title: String!
  type: String!
  content: JSON!        # BlockNode[]
  seo: JSON
  publishedAt: DateTime
}

type Collection {
  id: ID!
  slug: String!
  name: String!
  fields: [CollectionField!]!
  records(first: Int = 20, after: String, where: JSON): RecordConnection!
}

type CollectionField {
  key: String!
  type: String!
  required: Boolean!
}

type Record {
  id: ID!
  data: JSON!
  publishedAt: DateTime
}

type Post {
  id: ID!
  slug: String!
  title: String!
  excerpt: String
  content: JSON!        # Tiptap document
  category: Category
  tags: [Tag!]!
  seo: JSON
  publishedAt: DateTime
}

type Category { id: ID!, slug: String!, name: String! }
type Tag { id: ID!, slug: String!, name: String! }

type PageInfo { endCursor: String, hasNextPage: Boolean! }
type PageConnection { edges: [Page!]!, pageInfo: PageInfo! }
type RecordConnection { edges: [Record!]!, pageInfo: PageInfo! }
type PostConnection { edges: [Post!]!, pageInfo: PageInfo! }

type Query {
  site(id: ID!): Site
  page(siteId: ID!, slug: String!): Page
  records(collectionId: ID!, first: Int = 20, after: String, where: JSON): RecordConnection!
  post(siteId: ID!, slug: String!): Post
}
```

Query depth and complexity are bounded server-side to prevent abusive nested queries; pagination uses the same cursor model as REST (`first`/`after` → `endCursor`/`hasNextPage`).

---

## 5. Webhooks

Webhooks notify external systems of content events. Each `Webhook` (see [03-database-schema.md §2.13](./03-database-schema.md)) belongs to a `Site` and stores `url`, an `events String[]` subscription list, and a per-hook `secret`.

### 5.1 Event names

| Event | Fires when |
|---|---|
| `form.submitted` | A `FormSubmission` is created |
| `page.published` | A page transitions to published |
| `post.published` | A post is published |
| `record.published` | A collection record is published |
| `site.published` | A site is published |

### 5.2 Delivery & signature

Deliveries are enqueued onto the **BullMQ `webhooks` queue** (see [02-architecture.md §8](./02-architecture.md)) and POSTed as JSON. Each request carries an **HMAC-SHA256** signature of the raw body using the hook's `secret`:

```http
POST /your-endpoint HTTP/1.1
Content-Type: application/json
X-EasyCMS-Event: post.published
X-EasyCMS-Delivery: dlv_3f9c
X-EasyCMS-Signature: sha256=8b1a9953c4611296a827abf8c47804d7

{ "event": "post.published", "siteId": "site_1", "data": { "id": "post_42", "slug": "hello" }, "occurredAt": "2026-06-16T10:00:00Z" }
```

Consumers verify with `hmacSHA256(secret, rawBody)` in constant time before trusting the payload.

### 5.3 Retries & backoff

Non-2xx responses (or timeouts > 10s) are retried by the queue with **exponential backoff** (e.g. 1m, 5m, 30m, 2h, 6h) for up to ~24h, then the delivery is parked as failed and surfaced in the dashboard. Deliveries are at-least-once; consumers should treat `X-EasyCMS-Delivery` as an idempotency key.

---

## 6. API Keys

API keys authenticate the Content Delivery API and GraphQL read API. They map to the `ApiKey` model: `hashedKey @unique`, a display `prefix`, `scopes String[]`, and optional `expiresAt` / `revokedAt`.

### 6.1 Creation flow

```mermaid
sequenceDiagram
  participant U as Dashboard user
  participant API as /api/v1/api-keys
  participant DB as PostgreSQL
  U->>API: POST { name, scopes }
  API->>API: generate key = prefix + random(32B)
  API->>API: hashedKey = sha256(key)  (or bcrypt)
  API->>DB: store { prefix, hashedKey, scopes }
  API-->>U: 201 { id, prefix, key }  <-- full key shown ONCE
```

- The full key (`ek_live_<prefix><secret>`) is returned **exactly once** at creation; only the `prefix` is shown thereafter.
- The server stores **only** `hashedKey` (SHA-256 for constant-time `@unique` lookup, or bcrypt where slow hashing is preferred). Plaintext is never persisted. See [09-security.md](./09-security.md).

### 6.2 Verification, scopes, rotation, revocation

- **Verification:** on each request, hash the presented bearer token and look it up by `hashedKey` (indexed `@unique`); reject if missing, `revokedAt` set, or past `expiresAt`.
- **Scopes:** the key's `scopes` array gates resource families (e.g. `pages:read`, `content:read`, `posts:read`); insufficient scope → `403`.
- **Rotation:** `POST /api-keys/{id}/rotate` issues a new secret (new `hashedKey`), optionally honoring a grace window before invalidating the old one.
- **Revocation:** `DELETE /api-keys/{id}` sets `revokedAt`; the partial index `WHERE revokedAt IS NULL` (see [03-database-schema.md §5.3](./03-database-schema.md)) keeps active-key lookups fast.

---

## 7. Rate Limiting

A **Redis-backed token bucket** limits both the credentialed delivery API (per API key) and unauthenticated endpoints (per IP).

**Algorithm (token bucket).** Each principal has a bucket of capacity `B` that refills at `r` tokens/second. A request costs one token. The bucket state (`tokens`, `lastRefill`) lives in Redis under a key like `rl:key:{apiKeyId}` (or `rl:ip:{ip}`); a small Lua script atomically refills `min(B, tokens + (now - lastRefill) * r)`, then either decrements and allows, or rejects. Default tiers derive from the org's `Plan.features`.

When the bucket is empty:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1750070412
Content-Type: application/json

{ "error": { "code": "rate_limited", "message": "Too many requests." }, "requestId": "req_9c1f" }
```

Successful responses also carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` so clients can self-throttle.

---

## 8. Pagination & Filtering

List endpoints use **cursor-based** pagination.

| Param | Default | Max | Meaning |
|---|---|---|---|
| `cursor` | — | — | opaque id of the last item from the previous page |
| `limit` | 20 | 100 | page size |
| `sort` | `-createdAt` | — | field with optional `-` for descending |
| `filter[<field>]` | — | — | equality/range filter, e.g. `filter[status]=PUBLISHED` |

Cursors are opaque (typically the row `id`, which is sortable `cuid()`); clients pass back `pageInfo.nextCursor` to fetch the next page. Standard list envelope:

```json
{
  "data": [ /* … items … */ ],
  "pageInfo": { "nextCursor": "clp_last_id", "hasNextPage": true },
  "requestId": "req_4d2e"
}
```

When `hasNextPage` is `false`, `nextCursor` is `null`. Filtering and sorting are validated against an allow-list per resource (Zod schemas in `packages/core`) so arbitrary columns cannot be probed.

---

## 9. Errors

All errors share a single envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "title is required",
    "details": [ { "field": "title", "issue": "required" } ]
  },
  "requestId": "req_5a8b"
}
```

`code` is a stable machine-readable string; `message` is human-readable; `details` is optional structured context (e.g. Zod field errors). `requestId` is echoed in logs for correlation.

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `bad_request` | Malformed request / unparseable body |
| 401 | `unauthorized` | Missing/invalid session or API key |
| 403 | `forbidden` | Authenticated but lacks the required RBAC permission or scope |
| 404 | `not_found` | Resource absent **or** outside the caller's tenant scope |
| 409 | `conflict` | Uniqueness violation (e.g. duplicate slug, `@@unique([siteId, slug])`) |
| 422 | `validation_error` | Body parsed but failed Zod validation |
| 429 | `rate_limited` | Token bucket exhausted (see §7) |
| 500 | `internal_error` | Unexpected server error |

> Cross-tenant access returns **404, not 403**, so the API never confirms the existence of resources outside the caller's organization — a deliberate isolation choice (see [09-security.md](./09-security.md)).

For the underlying data model these endpoints read and write, see [03-database-schema.md](./03-database-schema.md); for how requests are authenticated and tenant-resolved, see [08-auth-architecture.md](./08-auth-architecture.md) and [02-architecture.md](./02-architecture.md).
