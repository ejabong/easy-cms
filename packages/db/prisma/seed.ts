import { PrismaClient, Role, TemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds baseline platform data: billing plans, a default global theme,
 * a couple of marketplace templates, and a demo organization + site.
 */
async function main() {
  // ── Plans ────────────────────────────────────────────────────────────
  const plans = [
    {
      name: 'Free',
      priceMonthly: 0,
      maxSites: 1,
      maxPages: 5,
      storageMb: 500,
      features: { customDomain: false, removeBranding: false, forms: true, ai: false },
    },
    {
      name: 'Starter',
      priceMonthly: 1200,
      maxSites: 3,
      maxPages: 50,
      storageMb: 5000,
      features: { customDomain: true, removeBranding: true, forms: true, ai: false },
    },
    {
      name: 'Professional',
      priceMonthly: 3900,
      maxSites: 10,
      maxPages: 500,
      storageMb: 50000,
      features: { customDomain: true, removeBranding: true, forms: true, ai: true },
    },
    {
      name: 'Agency',
      priceMonthly: 9900,
      maxSites: 100,
      maxPages: 5000,
      storageMb: 500000,
      features: { customDomain: true, removeBranding: true, forms: true, ai: true, whiteLabel: true },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  // ── Default global theme ─────────────────────────────────────────────
  const theme = await prisma.theme.upsert({
    where: { id: 'theme_default' },
    update: {},
    create: {
      id: 'theme_default',
      name: 'Default',
      isDefault: true,
      tokens: {
        colors: {
          primary: '#4f46e5',
          secondary: '#0ea5e9',
          background: '#ffffff',
          foreground: '#0f172a',
          muted: '#f1f5f9',
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          headingFamily: 'Inter, sans-serif',
          baseSize: '16px',
          scale: 1.25,
        },
        spacing: { unit: '4px' },
        radius: { base: '8px' },
        shadows: { base: '0 1px 3px rgba(0,0,0,0.1)' },
        dark: {
          background: '#0f172a',
          foreground: '#f8fafc',
          muted: '#1e293b',
        },
      },
    },
  });

  // ── Marketplace templates ────────────────────────────────────────────
  const templates: { name: string; slug: string; category: TemplateCategory }[] = [
    { name: 'Modern Business', slug: 'modern-business', category: 'BUSINESS' },
    { name: 'Creative Portfolio', slug: 'creative-portfolio', category: 'PORTFOLIO' },
    { name: 'SaaS Landing', slug: 'saas-landing', category: 'LANDING_PAGE' },
    { name: 'Minimal Blog', slug: 'minimal-blog', category: 'BLOG' },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {},
      create: { ...t, isPublished: true, themeId: theme.id },
    });
  }

  // ── Demo super admin + organization + site ───────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@easycms.app' },
    update: {},
    create: {
      email: 'admin@easycms.app',
      name: 'Platform Admin',
      emailVerified: true,
      platformRole: 'SUPER_ADMIN',
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Agency',
      slug: 'demo',
      ownerId: admin.id,
      members: { create: { userId: admin.id, role: Role.ADMIN } },
    },
  });

  const site = await prisma.site.upsert({
    where: { slug: 'demo-site' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Demo Site',
      slug: 'demo-site',
      description: 'A starter site seeded for local development.',
      status: 'PUBLISHED',
      themeId: theme.id,
      publishedAt: new Date(),
    },
  });

  await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: 'home' } },
    update: {},
    create: {
      siteId: site.id,
      title: 'Home',
      slug: 'home',
      type: 'HOME',
      status: 'PUBLISHED',
      isHomePage: true,
      publishedAt: new Date(),
      content: [
        {
          id: 'sec_hero',
          type: 'section',
          variant: 'hero-centered',
          props: {
            heading: 'Build beautiful websites, fast.',
            subheading: 'A drag-and-drop website builder for everyone.',
            ctaLabel: 'Get started',
            ctaHref: '/signup',
          },
          children: [],
        },
      ],
    },
  });

  console.log('✅ Seed complete: plans, theme, templates, demo org/site/page.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
