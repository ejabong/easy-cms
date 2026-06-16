# easy-cms — Product Requirements Document (PRD)

> Document 01 of the easy-cms documentation set. See [README](./README.md) for the full index.

| Field | Value |
|---|---|
| Product | **easy-cms** — Multi-tenant SaaS Website Builder & Headless CMS |
| Status | Draft v1.0 |
| Owner | Product / Architecture |
| Last updated | 2026-06-16 |

---

## 1. Vision

> Give anyone — from a solo freelancer to a 200-seat agency — a single platform to **design, manage, and publish** content-rich, fast, SEO-optimized websites without writing code, while remaining powerful enough that developers never feel boxed in.

easy-cms combines a **visual drag-and-drop website builder** (Webflow/Framer class) with a **headless, structured content backend** (Contentful/Sanity class) on top of a **true multi-tenant SaaS** foundation. One account can run many sites; one organization can host many clients; every published site is served from globally cached, statically rendered HTML.

The product wager: builders today force a choice between *visual power* (Webflow), *ease* (Wix/Squarespace), *developer freedom* (headless CMS + custom front-end), and *price* (WordPress). easy-cms refuses the trade by pairing a first-class visual editor with a real content model and a clean API, billed on transparent SaaS tiers.

---

## 2. Problem Statement

Building and operating a modern marketing/content website is still fragmented and painful:

1. **Tool sprawl.** A typical site stitches together a builder, a CMS, a forms tool, an analytics tool, an SEO plugin, a media host, and a deploy pipeline. Each is a subscription, an integration, and a failure point.
2. **The power/ease cliff.** Easy tools (Wix, Squarespace) hit a ceiling fast; powerful tools (Webflow, headless stacks) have a steep learning curve and developer dependency.
3. **Content vs. presentation coupling.** WordPress and page builders entangle structured content with layout, making content reuse, multi-channel delivery, and redesigns expensive.
4. **Agency multi-client overhead.** Agencies manage dozens of client sites across disconnected logins, with no shared component libraries, no role delegation, and no consolidated billing.
5. **Performance & SEO debt.** Plugin-heavy stacks are slow and ship poor Core Web Vitals, directly hurting rankings and conversions.

**easy-cms solves these by being one platform**: visual builder + structured CMS + media + forms + SEO + analytics + multi-tenant org/site management + billing, rendering published sites as static/ISR pages for top-tier performance.

---

## 3. Target Personas

| Persona | Who | Primary jobs-to-be-done | Key needs |
|---|---|---|---|
| **Small Business Owner** ("Bianca") | Runs a cafe, clinic, or local shop; non-technical | Get a professional site live fast; collect leads; update hours/menu | Templates, simple editing, forms, no jargon, low price |
| **Freelancer** ("Frank") | Designer/developer building sites for a handful of clients | Deliver polished sites quickly; reuse work; hand off to clients | Reusable blocks/templates, custom domains, white-ish handoff, mid tier |
| **Agency** ("Aria") | Studio with a team managing 20–200 client sites | Standardize delivery; manage teams & client access; consolidate billing | Orgs, RBAC, shared template/theme library, many sites, seat management, Agency tier |
| **Creator** ("Cleo") | Blogger, course-seller, newsletter author, influencer | Publish content frequently; grow audience; monetize | Blog/CMS, SEO, fast publishing, analytics, AI writing assist |

Secondary persona: **Developer** ("Dev") — extends sites via the REST/GraphQL API, webhooks, and custom collections; values the headless content model and clean APIs.

---

## 4. Goals & Non-Goals

### 4.1 Goals (MVP + near term)
- **G1** Visual drag-and-drop builder producing clean, responsive, accessible HTML.
- **G2** Structured headless CMS: collections, fields, references, records.
- **G3** Multi-tenancy: organizations → sites → pages, with strict tenant isolation.
- **G4** Custom domains/subdomains with automatic TLS and DNS guidance.
- **G5** Static/ISR rendering of published sites for excellent Core Web Vitals.
- **G6** Built-in blog, media library, forms, SEO tooling, and basic analytics.
- **G7** RBAC with org and site-scoped roles.
- **G8** Stripe billing with Free/Starter/Professional/Agency tiers and usage limits.
- **G9** Optional AI assistance (blog writer, page generator, SEO suggestions) on Claude.

### 4.2 Non-Goals (explicitly out of scope, at least for now)
- **N1** Full e-commerce/checkout (cart, payments, inventory). *Lead-gen and embeds only at launch.*
- **N2** A general-purpose application/database builder (no server-side code execution by tenants).
- **N3** Native mobile apps (responsive web only).
- **N4** Email marketing/CRM platform (we integrate, not replace).
- **N5** Self-hosted/on-prem distribution at launch (cloud SaaS only).
- **N6** Real-time multiplayer co-editing in MVP (single-editor lock + autosave first; collaboration in Phase 3).

---

## 5. Competitive Positioning

| Capability | **easy-cms** | Webflow | Wix | Framer | WordPress | Squarespace |
|---|---|---|---|---|---|---|
| Visual builder | ✅ dnd-kit canvas | ✅ (best-in-class) | ✅ | ✅ | ⚠️ via plugins | ✅ |
| Structured headless CMS | ✅ collections + API | ✅ CMS | ⚠️ limited | ⚠️ limited | ⚠️ via plugins | ⚠️ limited |
| Multi-site / multi-tenant orgs | ✅ first-class | ⚠️ workspaces | ❌ | ⚠️ | ❌ (multisite hacks) | ❌ |
| Agency/team RBAC | ✅ org+site roles | ✅ | ⚠️ | ⚠️ | ⚠️ plugins | ⚠️ |
| Static/ISR performance | ✅ SSG/ISR + CDN | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Clean REST + GraphQL API | ✅ | ⚠️ | ❌ | ⚠️ | ✅ (REST) | ❌ |
| Built-in forms/SEO/analytics | ✅ | ✅ | ✅ | ⚠️ | ⚠️ plugins | ✅ |
| AI content tools | ✅ Claude-based | ⚠️ | ✅ | ✅ | ⚠️ plugins | ✅ |
| Transparent SaaS pricing | ✅ | ⚠️ complex | ✅ | ✅ | ⚠️ hosting varies | ✅ |
| Developer extensibility | ✅ API/webhooks | ⚠️ | ❌ | ⚠️ | ✅ | ❌ |

**Positioning statement:** *easy-cms is the website platform for people who outgrew Wix but found Webflow too much — and for agencies who want Webflow-class power with real multi-tenant team and billing management.*

**Wedge:** the **agency + freelancer** segment, where multi-site management, reusable libraries, and consolidated billing are underserved by both the easy tools and the pro tools.

---

## 6. Feature List (grouped by module)

The product is organized into the fixed module domains: `auth, users, sites, templates, pages, builder, cms, blog, media, forms, seo, analytics, themes, billing`.

### 6.1 auth
- Email/password sign-up & login (Better Auth)
- Social login: Google, GitHub, Facebook
- Email verification, password reset
- Two-factor authentication (TOTP)
- Session management & device list

### 6.2 users & organizations
- User profile, avatar, preferences
- Organizations (tenants) with multiple members
- Memberships with roles (Super Admin / Admin / Editor / Author / Member)
- Invitations & seat management

### 6.3 sites
- Create/clone/archive sites within an org
- Custom domains & subdomains, automatic TLS
- Per-site settings, favicon, default locale
- Publish / unpublish / staging vs production

### 6.4 templates
- Starter site templates by industry/persona
- Page templates and section presets
- Org-private template library (agency reuse)

### 6.5 pages
- Page tree (hierarchy, slugs, nesting)
- Draft vs published, scheduled publishing
- Page versions & rollback
- Per-page SEO meta

### 6.6 builder
- Drag-and-drop block/section canvas (dnd-kit)
- Responsive breakpoint editing (desktop/tablet/mobile)
- Component registry of sections & primitives
- Reusable/synced blocks
- Undo/redo, autosave, version history (Zustand store)
- Rich text editing inside blocks (Tiptap)

### 6.7 cms (headless)
- Collections with custom fields
- Field types: text, rich text, number, boolean, date, media, reference, select, JSON, etc.
- Records with draft/published workflow
- Dynamic listing & detail pages bound to collections
- Content delivery via REST/GraphQL API

### 6.8 blog
- Posts, categories, tags, authors
- Scheduled posts, featured posts
- RSS/Atom feeds, sitemap inclusion

### 6.9 media
- Upload to S3/Cloudflare R2
- Folders, search, alt text, focal point
- Automatic responsive image variants / optimization

### 6.10 forms
- Form builder with field types & validation
- Submissions inbox, export, email notifications
- Spam protection, webhook on submit

### 6.11 seo
- Per-entity SEO meta (title, description, OG/Twitter)
- Sitemap.xml & robots.txt generation
- Redirects manager (301/302)
- Canonical URLs, structured data hooks

### 6.12 analytics
- Privacy-friendly page-view & event tracking
- Per-site dashboards (top pages, referrers, devices)
- Form conversion tracking

### 6.13 themes
- Theme tokens (colors, type, spacing, radius, shadows)
- Light/dark variants
- Per-site theme overrides; global theme presets

### 6.14 billing
- Stripe subscriptions: Free / Starter / Professional / Agency
- Trials, proration, upgrade/downgrade
- Usage metering (sites, members, storage, AI credits)
- Invoices & billing portal

---

## 7. User Stories (selected, by persona)

**Small Business (Bianca)**
- As a business owner, I can pick a template and have a live site within an hour.
- As a business owner, I can add a contact form and receive submissions by email.
- As a business owner, I can connect my custom domain without understanding DNS deeply.

**Freelancer (Frank)**
- As a freelancer, I can save a section as a reusable block to reuse across client sites.
- As a freelancer, I can duplicate a finished site as a starting point for the next client.
- As a freelancer, I can invite a client as an Editor so they update copy but can't break layout.

**Agency (Aria)**
- As an agency admin, I can manage 50 client sites under one organization with consolidated billing.
- As an agency admin, I can assign team members site-scoped roles.
- As an agency admin, I can maintain a shared theme + template library used across all client sites.

**Creator (Cleo)**
- As a creator, I can publish a blog post and have it appear in my feed, sitemap, and listing pages.
- As a creator, I can use the AI blog writer to draft a post from a title and outline.
- As a creator, I can see which posts drive the most traffic.

**Developer (Dev)**
- As a developer, I can query published content via REST and GraphQL with an API key.
- As a developer, I can subscribe to webhooks on publish/submit events.
- As a developer, I can define a custom collection and field schema for a client's content model.

---

## 8. Success Metrics / KPIs

### 8.1 Activation & Growth
| Metric | Target (first 12 months) |
|---|---|
| Sign-up → first published site | ≥ 35% within 7 days |
| Time-to-first-publish (median) | ≤ 30 minutes |
| Free → paid conversion | ≥ 6% |
| Net revenue retention (paid) | ≥ 105% |

### 8.2 Engagement
| Metric | Target |
|---|---|
| Weekly active editors / paid accounts | ≥ 60% |
| Sites per Agency account (avg) | ≥ 12 |
| Reusable blocks created per agency (avg) | ≥ 25 |

### 8.3 Quality / Performance
| Metric | Target |
|---|---|
| Published-site Lighthouse Performance (p75) | ≥ 90 |
| Largest Contentful Paint (p75) | ≤ 2.0s |
| Editor autosave success rate | ≥ 99.9% |
| Publish pipeline success rate | ≥ 99.9% |

### 8.4 Reliability & Trust
| Metric | Target |
|---|---|
| Control-plane uptime | ≥ 99.9% |
| Published-site (CDN) uptime | ≥ 99.95% |
| Cross-tenant data-leak incidents | 0 |

### 8.5 AI (where enabled)
| Metric | Target |
|---|---|
| AI feature adoption (paid accounts) | ≥ 25% |
| AI-assisted drafts accepted (kept ≥ 50% of text) | ≥ 40% |
| AI cost per active AI account / month | ≤ budgeted credit allotment |

---

## 9. Release Bounding (summary)

See [11-roadmap.md](./11-roadmap.md) for detail. MVP = auth, orgs/RBAC, sites, builder, pages, themes, media, basic SEO, blog, forms, Stripe Free/Starter. Phase 2 = headless CMS collections, analytics, GraphQL, Professional/Agency tiers, AI writer. Phase 3 = real-time collaboration, template marketplace, advanced AI, multi-locale.
