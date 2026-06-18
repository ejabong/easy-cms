import Link from 'next/link';

/**
 * Generic public renderers for CMS content. A collection has dynamic fields,
 * so these render field values by type rather than a fixed layout.
 */

export interface ViewField {
  key: string;
  name: string;
  type: string;
}

function titleOf(fields: ViewField[], data: Record<string, unknown>, fallback: string): string {
  const t = fields.find((f) => f.type === 'TEXT' || f.type === 'TEXTAREA');
  const v = t ? data[t.key] : undefined;
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function firstImage(fields: ViewField[], data: Record<string, unknown>): string | null {
  const f = fields.find((x) => x.type === 'IMAGE');
  const v = f ? data[f.key] : undefined;
  if (v && typeof v === 'object' && 'url' in (v as object)) return String((v as { url: unknown }).url);
  return null;
}

export function RecordList({
  basePath,
  fields,
  records,
}: {
  basePath: string;
  fields: ViewField[];
  records: { id: string; data: unknown }[];
}) {
  if (records.length === 0) {
    return <p className="px-6 py-16 text-center text-gray-500">No content published yet.</p>;
  }
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
      {records.map((r) => {
        const data = r.data as Record<string, unknown>;
        const img = firstImage(fields, data);
        return (
          <Link
            key={r.id}
            href={`${basePath}/${r.id}`}
            className="overflow-hidden rounded-lg border transition hover:shadow-md"
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="aspect-video w-full object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-semibold">{titleOf(fields, data, r.id)}</h3>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function RecordDetail({
  fields,
  data,
}: {
  fields: ViewField[];
  data: Record<string, unknown>;
}) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">{titleOf(fields, data, 'Untitled')}</h1>
      <dl className="space-y-6">
        {fields.map((f) => (
          <div key={f.key}>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{f.name}</dt>
            <dd className="mt-1">
              <FieldValue type={f.type} value={data[f.key]} />
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function FieldValue({ type, value }: { type: string; value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-300">—</span>;
  }
  switch (type) {
    case 'IMAGE':
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={String((value as { url: string }).url)} alt="" className="rounded-lg" />;
    case 'GALLERY':
      return (
        <div className="grid grid-cols-3 gap-2">
          {(value as { url: string }[]).map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={m.url} alt="" className="rounded" />
          ))}
        </div>
      );
    case 'BOOLEAN':
      return <span>{value ? 'Yes' : 'No'}</span>;
    case 'DATE':
      return <span>{new Date(String(value)).toLocaleDateString()}</span>;
    case 'MULTI_SELECT':
      return <span>{(value as string[]).join(', ')}</span>;
    case 'RICH_TEXT':
      return <div className="prose">{tiptapToText(value)}</div>;
    case 'REFERENCE':
      return <ReferenceValue value={value} />;
    case 'JSON':
      return <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>;
    default:
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }
}

function ReferenceValue({ value }: { value: unknown }) {
  const items = Array.isArray(value) ? value : [value];
  return (
    <ul className="list-disc pl-5">
      {items.map((item, i) => {
        if (item && typeof item === 'object' && 'id' in item) {
          const r = item as { id: string; data: Record<string, unknown> };
          const label = Object.values(r.data).find((v) => typeof v === 'string') ?? r.id;
          return <li key={i}>{String(label)}</li>;
        }
        return <li key={i}>{String(item)}</li>;
      })}
    </ul>
  );
}

/** Minimal Tiptap-JSON → plain text extraction (paragraphs). */
function tiptapToText(doc: unknown): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && n.text) out.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(doc);
  return out.join(' ');
}
