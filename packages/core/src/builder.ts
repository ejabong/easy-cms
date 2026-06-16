import { z } from 'zod';

/**
 * Builder block tree schema.
 *
 * A page's `content` is an array of Section nodes. The tree is:
 *   Page → Section[] → Row[] → Column[] → Component[]
 * but the recursive `BlockNode` shape allows arbitrary nesting so new
 * section/component types can be added via the component registry without
 * schema changes.
 */

export const BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

/** Per-breakpoint responsive style overrides. */
export const responsiveStyleSchema = z.object({
  desktop: z.record(z.any()).optional(),
  tablet: z.record(z.any()).optional(),
  mobile: z.record(z.any()).optional(),
});
export type ResponsiveStyle = z.infer<typeof responsiveStyleSchema>;

export const visibilitySchema = z.object({
  desktop: z.boolean().default(true),
  tablet: z.boolean().default(true),
  mobile: z.boolean().default(true),
});

export const animationSchema = z.object({
  type: z.enum(['none', 'fade', 'slide-up', 'slide-in', 'zoom']).default('none'),
  duration: z.number().default(300),
  delay: z.number().default(0),
});

export type BlockNode = {
  id: string;
  /** "section" | "row" | "column" | "component" */
  type: string;
  /** Registry key, e.g. "hero-centered", "button", "image". */
  variant?: string;
  props: Record<string, unknown>;
  style?: ResponsiveStyle;
  visibility?: z.infer<typeof visibilitySchema>;
  animation?: z.infer<typeof animationSchema>;
  children: BlockNode[];
};

// Input type is widened to `unknown` because `.default()` on nested schemas
// makes the parsed (output) type diverge from the accepted (input) type.
export const blockNodeSchema: z.ZodType<BlockNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    variant: z.string().optional(),
    props: z.record(z.any()),
    style: responsiveStyleSchema.optional(),
    visibility: visibilitySchema.optional(),
    animation: animationSchema.optional(),
    children: z.array(blockNodeSchema),
  }),
);

export const pageContentSchema = z.array(blockNodeSchema);
export type PageContent = z.infer<typeof pageContentSchema>;

/** Create a new block with a generated id. */
export function createBlock(
  type: string,
  variant: string | undefined,
  props: Record<string, unknown> = {},
): BlockNode {
  return {
    id: `blk_${Math.random().toString(36).slice(2, 10)}`,
    type,
    variant,
    props,
    children: [],
  };
}
