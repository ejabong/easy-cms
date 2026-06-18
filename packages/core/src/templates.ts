import type { BlockNode } from './builder';

/**
 * Pre-built template catalog.
 *
 * A template is a portable bundle: theme tokens + a set of pages, each holding
 * a builder block tree. Installing a template clones its theme into the target
 * org and creates the pages on a new site. The same blueprint shape is stored
 * in `TemplateVersion.manifest` so templates are versionable.
 */

export type TemplateCategoryKey =
  | 'BUSINESS'
  | 'PORTFOLIO'
  | 'AGENCY'
  | 'RESTAURANT'
  | 'ECOMMERCE'
  | 'PERSONAL'
  | 'BLOG'
  | 'LANDING_PAGE';

export type TemplatePageType =
  | 'HOME'
  | 'ABOUT'
  | 'CONTACT'
  | 'LANDING_PAGE'
  | 'BLOG'
  | 'CUSTOM';

export interface TemplatePageBlueprint {
  title: string;
  slug: string;
  type: TemplatePageType;
  isHomePage?: boolean;
  content: BlockNode[];
}

export interface TemplateManifest {
  themeTokens: Record<string, unknown>;
  pages: TemplatePageBlueprint[];
}

export interface TemplateBlueprint {
  name: string;
  slug: string;
  description: string;
  category: TemplateCategoryKey;
  thumbnail?: string | null;
  version: string;
  manifest: TemplateManifest;
}

/** Build a section block node. Ids are unique within a page. */
function section(id: string, variant: string, props: Record<string, unknown>): BlockNode {
  return { id, type: 'section', variant, props, children: [] };
}

const INDIGO_THEME = {
  colors: {
    primary: '#4f46e5',
    secondary: '#0ea5e9',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9',
  },
  typography: { fontFamily: 'Inter, sans-serif', headingFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.25 },
  spacing: { unit: '4px' },
  radius: { base: '10px' },
  shadows: { base: '0 1px 3px rgba(0,0,0,0.1)' },
};

const EMERALD_THEME = {
  ...INDIGO_THEME,
  colors: { ...INDIGO_THEME.colors, primary: '#059669', secondary: '#10b981' },
};

const SLATE_THEME = {
  ...INDIGO_THEME,
  colors: { ...INDIGO_THEME.colors, primary: '#0f172a', secondary: '#64748b' },
  radius: { base: '4px' },
};

export const TEMPLATE_CATALOG: TemplateBlueprint[] = [
  // ── 1. SaaS landing ──────────────────────────────────────────────────
  {
    name: 'Startup SaaS',
    slug: 'startup-saas',
    description: 'A high-converting landing page for software products.',
    category: 'LANDING_PAGE',
    version: '1.0.0',
    manifest: {
      themeTokens: INDIGO_THEME,
      pages: [
        {
          title: 'Home',
          slug: 'home',
          type: 'HOME',
          isHomePage: true,
          content: [
            section('s_hero', 'hero-centered', {
              heading: 'Ship your product faster',
              subheading: 'The all-in-one platform that takes you from idea to launch in days, not months.',
              ctaLabel: 'Start free trial',
              ctaHref: '/signup',
            }),
            section('s_stats', 'stats', {
              items: [
                { value: '10k+', label: 'Teams' },
                { value: '99.9%', label: 'Uptime' },
                { value: '4.9/5', label: 'Rating' },
              ],
            }),
            section('s_features', 'feature-grid', {
              heading: 'Everything you need to grow',
              features: [
                { title: 'Fast setup', description: 'Be up and running in minutes with sensible defaults.' },
                { title: 'Powerful API', description: 'Automate anything with our REST & GraphQL APIs.' },
                { title: 'Enterprise security', description: 'SOC 2, SSO, and audit logs out of the box.' },
              ],
            }),
            section('s_pricing', 'pricing', {
              heading: 'Simple, transparent pricing',
              plans: [
                { name: 'Starter', price: '$12', features: ['1 project', 'Community support'] },
                { name: 'Pro', price: '$39', features: ['Unlimited projects', 'Priority support', 'API access'] },
              ],
            }),
            section('s_faq', 'faq', {
              heading: 'Frequently asked questions',
              items: [
                { q: 'Is there a free trial?', a: 'Yes — 14 days, no credit card required.' },
                { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel with one click from your dashboard.' },
              ],
            }),
            section('s_cta', 'cta', {
              heading: 'Ready to get started?',
              ctaLabel: 'Create your account',
              ctaHref: '/signup',
            }),
          ],
        },
        {
          title: 'Pricing',
          slug: 'pricing',
          type: 'CUSTOM',
          content: [
            section('p_pricing', 'pricing', {
              heading: 'Plans for teams of every size',
              plans: [
                { name: 'Free', price: '$0', features: ['1 project', 'Community support'] },
                { name: 'Pro', price: '$39', features: ['Unlimited projects', 'Priority support'] },
                { name: 'Agency', price: '$99', features: ['White-label', 'Dedicated manager'] },
              ],
            }),
            section('p_faq', 'faq', {
              heading: 'Billing questions',
              items: [{ q: 'Do you offer annual billing?', a: 'Yes, save 20% with annual plans.' }],
            }),
          ],
        },
      ],
    },
  },

  // ── 2. Modern business ───────────────────────────────────────────────
  {
    name: 'Modern Business',
    slug: 'modern-business',
    description: 'A polished multi-page site for small businesses and consultancies.',
    category: 'BUSINESS',
    version: '1.0.0',
    manifest: {
      themeTokens: EMERALD_THEME,
      pages: [
        {
          title: 'Home',
          slug: 'home',
          type: 'HOME',
          isHomePage: true,
          content: [
            section('b_hero', 'hero-split', {
              heading: 'Grow your business with confidence',
              subheading: 'We help small businesses win more customers with strategy, design, and technology.',
              image: '',
            }),
            section('b_features', 'feature-grid', {
              heading: 'What we do',
              features: [
                { title: 'Strategy', description: 'Clear plans that move the needle.' },
                { title: 'Design', description: 'Brand and web experiences that convert.' },
                { title: 'Support', description: 'Ongoing help whenever you need it.' },
              ],
            }),
            section('b_testimonials', 'testimonials', {
              heading: 'Trusted by local businesses',
              items: [
                { quote: 'Our revenue doubled within six months.', author: 'Jordan M.', role: 'Owner, Bright Cafe' },
                { quote: 'Professional, responsive, and effective.', author: 'Priya S.', role: 'Director, Helix Law' },
              ],
            }),
            section('b_cta', 'cta', {
              heading: 'Let’s work together',
              ctaLabel: 'Get in touch',
              ctaHref: '/contact',
            }),
          ],
        },
        {
          title: 'About',
          slug: 'about',
          type: 'ABOUT',
          content: [
            section('a_text', 'rich-text', {
              html: '<h2>About us</h2><p>We are a small team of strategists and designers dedicated to helping local businesses thrive. Since 2015 we have partnered with over 200 companies.</p>',
            }),
          ],
        },
        {
          title: 'Contact',
          slug: 'contact',
          type: 'CONTACT',
          content: [
            section('c_text', 'rich-text', {
              html: '<h2>Contact</h2><p>Email us at hello@example.com or call (555) 123-4567. We typically respond within one business day.</p>',
            }),
            section('c_cta', 'cta', { heading: 'Prefer a call?', ctaLabel: 'Book a meeting', ctaHref: '#' }),
          ],
        },
      ],
    },
  },

  // ── 3. Creative portfolio ──────────────────────────────────────────────
  {
    name: 'Creative Portfolio',
    slug: 'creative-portfolio',
    description: 'A minimal portfolio to showcase your work and attract clients.',
    category: 'PORTFOLIO',
    version: '1.0.0',
    manifest: {
      themeTokens: SLATE_THEME,
      pages: [
        {
          title: 'Home',
          slug: 'home',
          type: 'HOME',
          isHomePage: true,
          content: [
            section('f_hero', 'hero-centered', {
              heading: 'Hi, I’m a designer & maker',
              subheading: 'I craft brands and digital products for ambitious teams.',
              ctaLabel: 'View my work',
              ctaHref: '/work',
            }),
            section('f_work', 'feature-grid', {
              heading: 'Selected work',
              features: [
                { title: 'Aurora Rebrand', description: 'Identity & web for a fintech startup.' },
                { title: 'Tide App', description: 'Product design for a wellness app.' },
                { title: 'Nort Studio', description: 'Portfolio site for an architecture firm.' },
              ],
            }),
            section('f_cta', 'cta', {
              heading: 'Have a project in mind?',
              ctaLabel: 'Let’s talk',
              ctaHref: '/contact',
            }),
          ],
        },
        {
          title: 'Work',
          slug: 'work',
          type: 'CUSTOM',
          content: [
            section('w_work', 'feature-grid', {
              heading: 'Case studies',
              features: [
                { title: 'Aurora Rebrand', description: 'Brand strategy, logo, and a new marketing site.' },
                { title: 'Tide App', description: 'End-to-end product design across iOS and Android.' },
              ],
            }),
          ],
        },
      ],
    },
  },
];

export function getTemplateBlueprint(slug: string): TemplateBlueprint | undefined {
  return TEMPLATE_CATALOG.find((t) => t.slug === slug);
}
