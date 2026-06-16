# easy-cms — Component Library & Design System

> Document 12 of the easy-cms documentation set. See [README](./README.md) for the full index.

| Field | Value |
|---|---|
| Document | Component Library & Design System |
| Status | Living document |
| Owner | Design Systems / Architecture |
| Last updated | 2026-06-16 |

---

## 1. Overview

This document is the catalog and reference for two related-but-distinct things:

1. **The design system** — the tokens (colors, typography, spacing, radius, shadows) that define how everything *looks*. Tokens live in the database as JSON on the `Theme` model and are projected into CSS custom properties consumed by Tailwind and shadcn/ui.
2. **The builder catalog** — the **sections** and **components** an end user can drag onto a page in the visual builder, plus the cross-cutting capabilities (responsive overrides, visibility, animation) that every block inherits.

It is ground-truthed against the running code: the seed theme in `packages/db/prisma/seed.ts`, the component registry in `apps/web/src/components/builder/registry.tsx`, the primitives in `apps/web/src/components/builder/components/primitives.tsx`, and the `BlockNode` schema in `packages/core/src/builder.ts`.

Cross-references: [06-builder-architecture.md](./06-builder-architecture.md) for how the builder works; [03-database-schema.md](./03-database-schema.md) for `Theme`, `Site`, `Page` and related models.

---

## 2. Design tokens

Themes are stored as a single JSON blob on `Theme.tokens` ([03-database-schema.md](./03-database-schema.md)). A `Theme` with a **null `organizationId` is a global theme** (the platform default); organizations can define their own, and any site may override which theme it uses via **`Site.themeId`**. At render time the resolved theme's tokens are emitted as CSS variables that both Tailwind utilities and shadcn/ui primitives read from.

### 2.1 Colors

**Light (base):**

| Token | Value | Swatch | Role |
|---|---|---|---|
| `primary` | `#4f46e5` | indigo | Primary actions, links, brand accents |
| `secondary` | `#0ea5e9` | sky | Secondary accents |
| `background` | `#ffffff` | white | Page background |
| `foreground` | `#0f172a` | slate-900 | Default text |
| `muted` | `#f1f5f9` | slate-100 | Subtle surfaces, dividers |

**Dark (overrides):**

| Token | Value | Role |
|---|---|---|
| `background` | `#0f172a` | Page background (dark) |
| `foreground` | `#f8fafc` | Default text (dark) |
| `muted` | `#1e293b` | Subtle surfaces (dark) |

> The dark block overrides only `background`, `foreground` and `muted`; `primary` and `secondary` carry over from the base palette so brand color stays consistent across modes.

### 2.2 Typography

| Token | Value |
|---|---|
| `fontFamily` | `Inter, sans-serif` |
| `headingFamily` | `Inter, sans-serif` |
| `baseSize` | `16px` |
| `scale` | `1.25` (modular scale, major third) |

Type sizes derive from a **1.25 modular scale** anchored at the 16px base. Computed steps:

| Step | Multiplier | Computed | Suggested use |
|---|---|---|---|
| `xs` | base ÷ 1.25 | `12.80px` | Captions, fine print |
| `base` | × 1 | `16px` | Body text |
| `lg` | × 1.25 | `20px` | Lead paragraph, H6 |
| `xl` | × 1.25² | `25px` | H4/H5 |
| `2xl` | × 1.25³ | `31.25px` | H3 |
| `3xl` | × 1.25⁴ | `39.06px` | H2 |
| `4xl` | × 1.25⁵ | `48.83px` | H1 / hero headings |

Both body and headings use **Inter**, differentiated by weight and size rather than family.

### 2.3 Spacing, radius & shadows

| Group | Token | Value | Notes |
|---|---|---|---|
| Spacing | `unit` | `4px` | Base step; the spacing scale is multiples of this unit (4, 8, 12, 16, 24, 32, …) |
| Radius | `base` | `8px` | Default corner radius for cards, buttons, inputs |
| Shadows | `base` | `0 1px 3px rgba(0,0,0,0.1)` | Default elevation |

A `4px` unit yields a familiar 4-point spacing scale. Components compose multiples (`unit × 2 = 8px`, `unit × 4 = 16px`, etc.) so spacing stays rhythmically consistent.

### 2.4 The seed token blob (ground truth)

This is the exact JSON stored on the default global theme (`Theme.id = "theme_default"`, `isDefault: true`):

```json
{
  "colors": {
    "primary": "#4f46e5",
    "secondary": "#0ea5e9",
    "background": "#ffffff",
    "foreground": "#0f172a",
    "muted": "#f1f5f9"
  },
  "typography": {
    "fontFamily": "Inter, sans-serif",
    "headingFamily": "Inter, sans-serif",
    "baseSize": "16px",
    "scale": 1.25
  },
  "spacing": { "unit": "4px" },
  "radius": { "base": "8px" },
  "shadows": { "base": "0 1px 3px rgba(0,0,0,0.1)" },
  "dark": {
    "background": "#0f172a",
    "foreground": "#f8fafc",
    "muted": "#1e293b"
  }
}
```

### 2.5 Mapping tokens → CSS variables → Tailwind

Resolved tokens are emitted as CSS custom properties on the document root (with the `dark` block applied under a `.dark` scope), then referenced by Tailwind's theme and by shadcn/ui primitives:

```css
:root {
  --color-primary: #4f46e5;
  --color-secondary: #0ea5e9;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --font-sans: Inter, sans-serif;
  --font-heading: Inter, sans-serif;
  --text-base: 16px;
  --radius: 8px;
  --shadow-base: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dark {
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
  --color-muted: #1e293b;
}
```

```ts
// tailwind.config — theme reads the CSS variables
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        muted: 'var(--color-muted)',
      },
      fontFamily: { sans: 'var(--font-sans)', heading: 'var(--font-heading)' },
      borderRadius: { DEFAULT: 'var(--radius)' },
      boxShadow: { DEFAULT: 'var(--shadow-base)' },
    },
  },
};
```

This indirection is what lets a per-site theme override (`Site.themeId`) restyle an entire published site by swapping the variable values — no component changes required. For example, the `button` primitive renders with `bg-primary`, which resolves to whatever `--color-primary` the active theme provides.

---

## 3. shadcn/ui vs builder render components

There are **two component layers** and they must not be confused:

| Layer | Where | Purpose | Themed by |
|---|---|---|---|
| **shadcn/ui primitives** | Dashboard / editor chrome (`apps/web`) | Buttons, dialogs, inputs, the inspector panel, the palette, tables — the *application UI* operators use | App theme (CSS vars) |
| **Builder render components** | `components/builder/**` registry | Sections & component blocks that compose the *end-user's published page* | Tenant site theme (`Site.themeId`) |

shadcn/ui is for building the tool. The builder catalog below is what the tool lets users build. A user dragging a "Button" block is placing the **builder** `button` render component (a themed `<a>` with `bg-primary`) onto their page — not a shadcn `<Button>`.

---

## 4. Sections catalog

Sections are full-width page blocks (`type: 'section'`). All 9 below are **implemented** in `registry.tsx`.

| Variant | Label | Category | Default props (keys) | Inspector fields |
|---|---|---|---|---|
| `hero-centered` | Centered Hero | hero | `heading`, `subheading`, `ctaLabel`, `ctaHref` | heading (text), subheading (textarea), ctaLabel (text), ctaHref (url) |
| `hero-split` | Split Hero | hero | `heading`, `subheading`, `image` | heading (text), subheading (textarea), image (image) |
| `rich-text` | Rich Text | text | `html` | html (textarea) |
| `feature-grid` | Feature Grid | business | `heading`, `features[]` | heading (text), features (json) |
| `cta` | Call To Action | marketing | `heading`, `ctaLabel`, `ctaHref` | heading (text), ctaLabel (text), ctaHref (url) |
| `testimonials` | Testimonials | business | `heading`, `items[]` | heading (text), items (json) |
| `pricing` | Pricing | business | `heading`, `plans[]` | heading (text), plans (json) |
| `faq` | FAQ | content | `heading`, `items[]` | heading (text), items (json) |
| `stats` | Stats | marketing | `items[]` | items (json) |

### 4.1 `hero-centered` — Centered Hero (`hero`)

A centered headline, supporting subheading and a single call-to-action button.

```jsonc
// defaults
{
  "heading": "Your headline here",
  "subheading": "A short supporting sentence that explains the value.",
  "ctaLabel": "Get started",
  "ctaHref": "#"
}
```

Inspector: `heading` (text), `subheading` (textarea), `ctaLabel` (text, "Button label"), `ctaHref` (url, "Button link").

### 4.2 `hero-split` — Split Hero (`hero`)

A two-column hero pairing copy with an image.

```jsonc
{ "heading": "Your headline here", "subheading": "Supporting text.", "image": "" }
```

Inspector: `heading` (text), `subheading` (textarea), `image` (image).

### 4.3 `rich-text` — Rich Text (`text`)

A free-form HTML content block (authored via Tiptap; stored as an HTML string).

```jsonc
{ "html": "<p>Write something compelling…</p>" }
```

Inspector: `html` (textarea, "Content (HTML)").

### 4.4 `feature-grid` — Feature Grid (`business`)

A heading plus a grid of feature cards. `features` is an array of `{ title, description }` (3 by default).

```jsonc
{
  "heading": "Everything you need",
  "features": [
    { "title": "Fast", "description": "Blazing performance out of the box." },
    { "title": "Flexible", "description": "Customize every detail." },
    { "title": "Friendly", "description": "Built for non-technical users." }
  ]
}
```

Inspector: `heading` (text), `features` (json, "Features (JSON)").

### 4.5 `cta` — Call To Action (`marketing`)

A focused conversion band: heading + button.

```jsonc
{ "heading": "Ready to get started?", "ctaLabel": "Sign up", "ctaHref": "#" }
```

Inspector: `heading` (text), `ctaLabel` (text, "Button label"), `ctaHref` (url, "Button link").

### 4.6 `testimonials` — Testimonials (`business`)

Social proof. `items` is an array of `{ quote, author, role }` (2 by default).

```jsonc
{
  "heading": "Loved by teams everywhere",
  "items": [
    { "quote": "This changed how we ship websites.", "author": "Alex P.", "role": "Founder" },
    { "quote": "Incredibly easy to use.", "author": "Sam R.", "role": "Designer" }
  ]
}
```

Inspector: `heading` (text), `items` (json, "Testimonials (JSON)").

### 4.7 `pricing` — Pricing (`business`)

Pricing tiers. `plans` is an array of `{ name, price, features[] }` (2 by default).

```jsonc
{
  "heading": "Simple pricing",
  "plans": [
    { "name": "Starter", "price": "$12", "features": ["3 sites", "Custom domain"] },
    { "name": "Pro", "price": "$39", "features": ["10 sites", "AI tools", "Priority support"] }
  ]
}
```

Inspector: `heading` (text), `plans` (json, "Plans (JSON)").

### 4.8 `faq` — FAQ (`content`)

Question/answer list. `items` is an array of `{ q, a }`.

```jsonc
{
  "heading": "Frequently asked questions",
  "items": [{ "q": "Is there a free plan?", "a": "Yes, the Free plan is generous." }]
}
```

Inspector: `heading` (text), `items` (json, "Q&A (JSON)").

### 4.9 `stats` — Stats (`marketing`)

A row of metrics. `items` is an array of `{ value, label }` (3 by default). Note: no `heading` field.

```jsonc
{
  "items": [
    { "value": "10k+", "label": "Websites" },
    { "value": "99.9%", "label": "Uptime" },
    { "value": "24/7", "label": "Support" }
  ]
}
```

Inspector: `items` (json, "Stats (JSON)").

### 4.10 Planned sections

These appear on the roadmap ([11-roadmap.md](./11-roadmap.md)) but are **not yet implemented**:

| Variant | Suggested category | Purpose |
|---|---|---|
| `header` | navigation | Site header / nav bar |
| `footer` | navigation | Site footer with links |
| `gallery` | media | Image gallery / grid |
| `team` | business | Team member profiles |
| `services` | business | Services / offerings list |

---

## 5. Components catalog

Components are inline/primitive blocks (`type: 'component'`, category `component`), defined in `primitives.tsx`. All 3 below are **implemented**.

| Variant | Label | Default props | Inspector fields | Renders |
|---|---|---|---|---|
| `button` | Button | `label: 'Click me'`, `href: '#'` | label (text), href (url) | `<a>` with `bg-primary`, white text |
| `heading` | Heading | `text: 'Heading'`, `level: 2` | text (text), level (select H1/H2/H3) | `<h1>` / `<h2>` / `<h3>` |
| `image` | Image | `src: ''`, `alt: ''` | src (image, "Image URL"), alt (text) | `<img>` full-width, rounded |

### 5.1 `button`

Renders a themed anchor: `<a href={href} class="… bg-primary text-white …">{label}</a>`. The `bg-primary` utility resolves to the active theme's `--color-primary`.

Inspector: `label` (text), `href` (url).

### 5.2 `heading`

Renders `h1`/`h2`/`h3` based on `level` (default `2`), with `font-bold tracking-tight`. The `level` field is a **select** offering H1/H2/H3.

Inspector: `text` (text), `level` (select: H1=`1`, H2=`2`, H3=`3`).

### 5.3 `image`

Renders a full-width, auto-height, rounded `<img>` from `src` with `alt` text.

Inspector: `src` (image, "Image URL"), `alt` (text).

### 5.4 Planned components

Not yet implemented; on the roadmap:

| Variant | Purpose |
|---|---|
| `text` | Inline rich/plain text run |
| `card` | Generic content card |
| `icon` | Icon glyph |
| `badge` | Label / pill |
| `form` | Form container (pairs with the forms runtime, MVP) |
| `tabs` | Tabbed content |
| `accordion` | Collapsible content |

---

## 6. Cross-cutting block capabilities

Every `BlockNode` — section *or* component — inherits three optional capabilities from the builder schema in `packages/core/src/builder.ts`. They apply uniformly across the entire catalog above; the registry does not need to opt in.

| Capability | Field | Options / shape | Default |
|---|---|---|---|
| **Responsive style overrides** | `style` | `{ desktop?, tablet?, mobile? }`, each an arbitrary style record applied at that breakpoint | none |
| **Visibility** | `visibility` | `{ desktop, tablet, mobile }` booleans — hide a block per breakpoint | each `true` |
| **Animation** | `animation` | `{ type, duration, delay }` | see below |

Breakpoints are fixed: **`desktop` · `tablet` · `mobile`** (`BREAKPOINTS`).

### 6.1 Responsive style overrides (`style`)

Per-breakpoint style records let a block diverge by viewport (e.g. larger padding on desktop, stacked on mobile). Any of the three breakpoint keys is optional; an absent key inherits the base/desktop styling.

### 6.2 Visibility (`visibility`)

Three booleans, each defaulting to `true`. Set one to `false` to hide the block at that breakpoint (e.g. hide a decorative hero image on `mobile`).

| Key | Type | Default |
|---|---|---|
| `desktop` | boolean | `true` |
| `tablet` | boolean | `true` |
| `mobile` | boolean | `true` |

### 6.3 Animation (`animation`)

Entrance animation applied when the block enters view.

| Field | Type | Allowed values / default |
|---|---|---|
| `type` | enum | `none` (default) · `fade` · `slide-up` · `slide-in` · `zoom` |
| `duration` | number (ms) | default `300` |
| `delay` | number (ms) | default `0` |

```jsonc
// Example BlockNode exercising all three capabilities
{
  "id": "blk_a1b2c3d4",
  "type": "section",
  "variant": "hero-centered",
  "props": { "heading": "Welcome", "ctaLabel": "Get started", "ctaHref": "/signup" },
  "style": { "mobile": { "paddingTop": "24px" } },
  "visibility": { "desktop": true, "tablet": true, "mobile": false },
  "animation": { "type": "fade", "duration": 400, "delay": 100 },
  "children": []
}
```

See [06-builder-architecture.md](./06-builder-architecture.md) for how `BlockRenderer` consumes these at render time in both the editor and the published site.

---

## 7. Inspector field-type reference

The inspector renders one input per `InspectorField`. The available `type` values (from `registry.tsx`):

| Type | Renders | Used by |
|---|---|---|
| `text` | Single-line text input | headings, labels, `alt` |
| `textarea` | Multi-line text area | subheadings, `rich-text` HTML |
| `url` | URL input | `ctaHref`, button `href` |
| `number` | Numeric input | (available; not yet used by a shipped block) |
| `image` | Image picker / URL field | `hero-split` image, `image.src` |
| `select` | Dropdown (uses `options[]`) | `heading.level` (H1/H2/H3) |
| `json` | Raw JSON editor for array/object props | feature/testimonial/pricing/faq/stats lists |

A field is `{ key, label, type, options?, placeholder? }`; `options` is required only for `select`.

---

## 8. Extending the catalog

To add a section or component: implement the render component, register a `RegistryEntry` (variant, label, category, type, render, defaults, inspector) in `registry.tsx`, and it automatically appears in the palette (`PALETTE = Object.values(REGISTRY)`) and is resolvable via `getRegistryEntry(variant)`. Because all blocks inherit the §6 cross-cutting capabilities and read theme tokens via CSS variables, new blocks gain responsive/visibility/animation support and theming for free.

See also: [06-builder-architecture.md](./06-builder-architecture.md) · [03-database-schema.md](./03-database-schema.md) · [11-roadmap.md](./11-roadmap.md).
