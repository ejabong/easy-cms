import type { ComponentType } from 'react';
import type { BlockNode } from '@easy-cms/core';
import { HeroCentered, HeroSplit } from './sections/hero';
import { RichTextSection } from './sections/rich-text';
import { FeatureGrid } from './sections/feature-grid';
import { CTASection } from './sections/cta';
import { TestimonialsSection } from './sections/testimonials';
import { PricingSection } from './sections/pricing';
import { FAQSection } from './sections/faq';
import { StatsSection } from './sections/stats';
import { ButtonComponent, HeadingComponent, ImageComponent } from './components/primitives';

export type BlockComponent = ComponentType<{ node: BlockNode; editing?: boolean }>;

/** A single editable property surfaced in the inspector panel. */
export interface InspectorField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'number' | 'image' | 'select' | 'json';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface RegistryEntry {
  variant: string;
  label: string;
  category: 'hero' | 'text' | 'media' | 'content' | 'business' | 'marketing' | 'blog' | 'component';
  type: 'section' | 'component';
  render: BlockComponent;
  /** Default props applied when a block is dropped onto the canvas. */
  defaults: Record<string, unknown>;
  /** Fields rendered by the inspector for this block. */
  inspector: InspectorField[];
}

export const REGISTRY: Record<string, RegistryEntry> = {
  'hero-centered': {
    variant: 'hero-centered',
    label: 'Centered Hero',
    category: 'hero',
    type: 'section',
    render: HeroCentered,
    defaults: {
      heading: 'Your headline here',
      subheading: 'A short supporting sentence that explains the value.',
      ctaLabel: 'Get started',
      ctaHref: '#',
    },
    inspector: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'textarea' },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'ctaHref', label: 'Button link', type: 'url' },
    ],
  },
  'hero-split': {
    variant: 'hero-split',
    label: 'Split Hero',
    category: 'hero',
    type: 'section',
    render: HeroSplit,
    defaults: { heading: 'Your headline here', subheading: 'Supporting text.', image: '' },
    inspector: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
    ],
  },
  'rich-text': {
    variant: 'rich-text',
    label: 'Rich Text',
    category: 'text',
    type: 'section',
    render: RichTextSection,
    defaults: { html: '<p>Write something compelling…</p>' },
    inspector: [{ key: 'html', label: 'Content (HTML)', type: 'textarea' }],
  },
  'feature-grid': {
    variant: 'feature-grid',
    label: 'Feature Grid',
    category: 'business',
    type: 'section',
    render: FeatureGrid,
    defaults: {
      heading: 'Everything you need',
      features: [
        { title: 'Fast', description: 'Blazing performance out of the box.' },
        { title: 'Flexible', description: 'Customize every detail.' },
        { title: 'Friendly', description: 'Built for non-technical users.' },
      ],
    },
    inspector: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'features', label: 'Features (JSON)', type: 'json' },
    ],
  },
  cta: {
    variant: 'cta',
    label: 'Call To Action',
    category: 'marketing',
    type: 'section',
    render: CTASection,
    defaults: { heading: 'Ready to get started?', ctaLabel: 'Sign up', ctaHref: '#' },
    inspector: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'ctaHref', label: 'Button link', type: 'url' },
    ],
  },
  testimonials: {
    variant: 'testimonials',
    label: 'Testimonials',
    category: 'business',
    type: 'section',
    render: TestimonialsSection,
    defaults: {
      heading: 'Loved by teams everywhere',
      items: [
        { quote: 'This changed how we ship websites.', author: 'Alex P.', role: 'Founder' },
        { quote: 'Incredibly easy to use.', author: 'Sam R.', role: 'Designer' },
      ],
    },
    inspector: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'items', label: 'Testimonials (JSON)', type: 'json' },
    ],
  },
  pricing: {
    variant: 'pricing',
    label: 'Pricing',
    category: 'business',
    type: 'section',
    render: PricingSection,
    defaults: {
      heading: 'Simple pricing',
      plans: [
        { name: 'Starter', price: '$12', features: ['3 sites', 'Custom domain'] },
        { name: 'Pro', price: '$39', features: ['10 sites', 'AI tools', 'Priority support'] },
      ],
    },
    inspector: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'plans', label: 'Plans (JSON)', type: 'json' },
    ],
  },
  faq: {
    variant: 'faq',
    label: 'FAQ',
    category: 'content',
    type: 'section',
    render: FAQSection,
    defaults: {
      heading: 'Frequently asked questions',
      items: [{ q: 'Is there a free plan?', a: 'Yes, the Free plan is generous.' }],
    },
    inspector: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'items', label: 'Q&A (JSON)', type: 'json' },
    ],
  },
  stats: {
    variant: 'stats',
    label: 'Stats',
    category: 'marketing',
    type: 'section',
    render: StatsSection,
    defaults: {
      items: [
        { value: '10k+', label: 'Websites' },
        { value: '99.9%', label: 'Uptime' },
        { value: '24/7', label: 'Support' },
      ],
    },
    inspector: [{ key: 'items', label: 'Stats (JSON)', type: 'json' }],
  },
  button: {
    variant: 'button',
    label: 'Button',
    category: 'component',
    type: 'component',
    render: ButtonComponent,
    defaults: { label: 'Click me', href: '#' },
    inspector: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'href', label: 'Link', type: 'url' },
    ],
  },
  heading: {
    variant: 'heading',
    label: 'Heading',
    category: 'component',
    type: 'component',
    render: HeadingComponent,
    defaults: { text: 'Heading', level: 2 },
    inspector: [
      { key: 'text', label: 'Text', type: 'text' },
      {
        key: 'level',
        label: 'Level',
        type: 'select',
        options: [
          { label: 'H1', value: '1' },
          { label: 'H2', value: '2' },
          { label: 'H3', value: '3' },
        ],
      },
    ],
  },
  image: {
    variant: 'image',
    label: 'Image',
    category: 'component',
    type: 'component',
    render: ImageComponent,
    defaults: { src: '', alt: '' },
    inspector: [
      { key: 'src', label: 'Image URL', type: 'image' },
      { key: 'alt', label: 'Alt text', type: 'text' },
    ],
  },
};

export function getRegistryEntry(variant?: string): RegistryEntry | undefined {
  return variant ? REGISTRY[variant] : undefined;
}

export const PALETTE = Object.values(REGISTRY);
