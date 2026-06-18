import { z, type ZodTypeAny } from 'zod';

/**
 * Headless CMS domain logic.
 *
 * Collections are schema-on-write: the contract lives in field definitions,
 * the values live in `Record.data` keyed by each field's machine `key`. This
 * module builds a Zod schema at runtime from a collection's fields so every
 * write can be validated against its (data-defined) schema.
 *
 * Kept framework-free: callers pass a structural `FieldDefinition[]` (Prisma's
 * `CollectionField` rows satisfy this shape).
 */

export const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'RICH_TEXT',
  'NUMBER',
  'BOOLEAN',
  'DATE',
  'IMAGE',
  'GALLERY',
  'JSON',
  'SELECT',
  'MULTI_SELECT',
  'REFERENCE',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldDefinition {
  key: string;
  type: FieldType;
  required: boolean;
  config?: unknown;
}

export interface SelectOption {
  value: string;
  label: string;
}

type FieldConfig = {
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  options?: SelectOption[];
  multiple?: boolean;
  targetCollectionId?: string;
};

function schemaForField(type: FieldType, cfg: FieldConfig): ZodTypeAny {
  switch (type) {
    case 'TEXT':
    case 'TEXTAREA': {
      let s = z.string();
      if (cfg.maxLength) s = s.max(cfg.maxLength);
      if (cfg.pattern) s = s.regex(new RegExp(cfg.pattern));
      return s;
    }
    case 'RICH_TEXT':
    case 'JSON':
      return z.record(z.any());
    case 'NUMBER': {
      let n = z.number();
      if (typeof cfg.min === 'number') n = n.min(cfg.min);
      if (typeof cfg.max === 'number') n = n.max(cfg.max);
      if (cfg.integer) n = n.int();
      return n;
    }
    case 'BOOLEAN':
      return z.boolean();
    case 'DATE':
      return z.string().datetime();
    case 'IMAGE':
      return z.object({ id: z.string(), url: z.string().url(), alt: z.string().optional() });
    case 'GALLERY':
      return z.array(
        z.object({ id: z.string(), url: z.string().url(), alt: z.string().optional() }),
      );
    case 'SELECT': {
      const values = (cfg.options ?? []).map((o) => o.value);
      // z.enum requires a non-empty tuple; fall back to a plain string.
      return values.length ? z.enum(values as [string, ...string[]]) : z.string();
    }
    case 'MULTI_SELECT': {
      const values = (cfg.options ?? []).map((o) => o.value);
      const inner = values.length ? z.enum(values as [string, ...string[]]) : z.string();
      return z.array(inner);
    }
    case 'REFERENCE':
      return cfg.multiple ? z.array(z.string()) : z.string();
    default:
      return z.any();
  }
}

/** Build a strict Zod object schema from a collection's field definitions. */
export function buildRecordSchema(fields: FieldDefinition[]) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    const cfg = (field.config ?? {}) as FieldConfig;
    const schema = schemaForField(field.type, cfg);
    shape[field.key] = field.required ? schema : schema.optional();
  }
  return z.object(shape).strict();
}

/** Whether a field type is editable with a simple HTML control vs. a special widget. */
export function isSimpleField(type: FieldType): boolean {
  return ['TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT'].includes(type);
}
