import type { ComponentType } from 'react';
import type { BlockNode } from '@easy-cms/core';
import { HeroCentered, HeroSplit } from './sections/hero';
import { RichTextSection } from './sections/rich-text';
import { FeatureGrid } from './sections/feature-grid';
import { CTASection } from './sections/cta';
import { ButtonComponent, HeadingComponent, ImageComponent } from './components/primitives';

export type BlockComponent = ComponentType<{ node: BlockNode; editing?: boolean }>;

/**
 * Component registry. The builder UI lists these as draggable blocks; the
 * renderer looks up `node.variant` here to render the live tree.
 *
 * Each entry declares metadata for the builder palette and a React renderer.
 */
export interface RegistryEntry {
  variant: string;
  label: string;
  category: 'hero' | 'text' | 'media' | 'content' | 'business' | 'marketing' | 'blog' | 'component';
  type: 'section' | 'component';
  render: BlockComponent;
}

export const REGISTRY: Record<string, RegistryEntry> = {
  'hero-centered': { variant: 'hero-centered', label: 'Centered Hero', category: 'hero', type: 'section', render: HeroCentered },
  'hero-split': { variant: 'hero-split', label: 'Split Hero', category: 'hero', type: 'section', render: HeroSplit },
  'rich-text': { variant: 'rich-text', label: 'Rich Text', category: 'text', type: 'section', render: RichTextSection },
  'feature-grid': { variant: 'feature-grid', label: 'Feature Grid', category: 'business', type: 'section', render: FeatureGrid },
  cta: { variant: 'cta', label: 'Call To Action', category: 'marketing', type: 'section', render: CTASection },
  button: { variant: 'button', label: 'Button', category: 'component', type: 'component', render: ButtonComponent },
  heading: { variant: 'heading', label: 'Heading', category: 'component', type: 'component', render: HeadingComponent },
  image: { variant: 'image', label: 'Image', category: 'component', type: 'component', render: ImageComponent },
};

export function getRegistryEntry(variant?: string): RegistryEntry | undefined {
  return variant ? REGISTRY[variant] : undefined;
}

export const PALETTE = Object.values(REGISTRY);
