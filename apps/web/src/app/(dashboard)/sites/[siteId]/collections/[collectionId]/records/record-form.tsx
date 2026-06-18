'use client';

import { saveRecord } from '../../actions';
import type { FieldDTO } from '@/lib/data/collections';

/**
 * Dynamic record editor: renders one control per collection field, driven by
 * the field's type. Submits to the `saveRecord` server action, which rebuilds
 * the typed data object and validates it with the collection's Zod schema.
 */
export function RecordForm({
  siteId,
  collectionId,
  recordId,
  fields,
  data,
}: {
  siteId: string;
  collectionId: string;
  recordId?: string;
  fields: FieldDTO[];
  data: Record<string, unknown>;
}) {
  return (
    <form action={saveRecord} className="space-y-5">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="collectionId" value={collectionId} />
      {recordId && <input type="hidden" name="recordId" value={recordId} />}

      {fields.map((field) => (
        <div key={field.id}>
          <label className="mb-1 block text-sm font-medium">
            {field.name}
            {field.required && <span className="text-red-500"> *</span>}
            <span className="ml-2 text-xs font-normal text-gray-400">{field.type}</span>
          </label>
          <FieldInput field={field} value={data[field.key]} />
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button
          name="publish"
          value="false"
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Save draft
        </button>
        <button
          name="publish"
          value="true"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Publish
        </button>
      </div>
    </form>
  );
}

function FieldInput({ field, value }: { field: FieldDTO; value: unknown }) {
  const base = 'w-full rounded-md border px-3 py-2 text-sm';
  const options = field.config?.options ?? [];

  switch (field.type) {
    case 'TEXTAREA':
      return <textarea name={field.key} rows={4} defaultValue={asString(value)} className={base} />;
    case 'NUMBER':
      return <input type="number" name={field.key} defaultValue={asString(value)} className={base} />;
    case 'BOOLEAN':
      return (
        <input
          type="checkbox"
          name={field.key}
          defaultChecked={value === true}
          className="h-4 w-4"
        />
      );
    case 'DATE':
      return (
        <input
          type="datetime-local"
          name={field.key}
          defaultValue={toLocalDateTime(value)}
          className={base}
        />
      );
    case 'SELECT':
      return (
        <select name={field.key} defaultValue={asString(value)} className={base}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'MULTI_SELECT':
      return (
        <select
          name={field.key}
          multiple
          defaultValue={Array.isArray(value) ? (value as string[]) : []}
          className={`${base} h-28`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'IMAGE':
      return (
        <input
          type="url"
          name={field.key}
          placeholder="https://…"
          defaultValue={isRecord(value) ? asString(value.url) : ''}
          className={base}
        />
      );
    case 'JSON':
    case 'GALLERY':
    case 'RICH_TEXT':
      return (
        <textarea
          name={field.key}
          rows={5}
          defaultValue={value ? JSON.stringify(value, null, 2) : ''}
          placeholder="Valid JSON"
          className={`${base} font-mono`}
        />
      );
    default: // TEXT, REFERENCE
      return <input type="text" name={field.key} defaultValue={asString(value)} className={base} />;
  }
}

function asString(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toLocalDateTime(v: unknown): string {
  if (typeof v !== 'string') return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  // Format as yyyy-MM-ddThh:mm for datetime-local.
  return d.toISOString().slice(0, 16);
}
