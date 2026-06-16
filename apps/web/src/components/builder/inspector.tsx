'use client';

import { useEditor } from '@/lib/store/editor';
import { getRegistryEntry, type InspectorField } from './registry';

/**
 * Right-hand properties panel. Reads the selected block, looks up its
 * inspector field schema in the registry, and writes edits back through the
 * store (which records undo history + marks the page dirty for autosave).
 */
export function Inspector() {
  const selectedId = useEditor((s) => s.selectedId);
  const findBlock = useEditor((s) => s.findBlock);
  const updateProps = useEditor((s) => s.updateProps);
  const removeBlock = useEditor((s) => s.removeBlock);
  const duplicateBlock = useEditor((s) => s.duplicateBlock);

  if (!selectedId) {
    return (
      <aside className="w-72 border-l p-4 text-sm text-gray-400">
        Select a block to edit its properties.
      </aside>
    );
  }

  const block = findBlock(selectedId);
  const entry = block && getRegistryEntry(block.variant);

  if (!block || !entry) {
    return <aside className="w-72 border-l p-4 text-sm text-gray-400">Unknown block.</aside>;
  }

  return (
    <aside className="w-72 overflow-y-auto border-l p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{entry.label}</h3>
        <div className="flex gap-2 text-xs">
          <button onClick={() => duplicateBlock(block.id)} className="text-gray-500 hover:text-gray-900">
            Duplicate
          </button>
          <button onClick={() => removeBlock(block.id)} className="text-red-500 hover:text-red-700">
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {entry.inspector.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={block.props[field.key]}
            onChange={(value) => updateProps(block.id, { [field.key]: value })}
          />
        ))}
      </div>
    </aside>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: InspectorField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = (
    <label className="mb-1 block text-xs font-medium text-gray-600">{field.label}</label>
  );

  if (field.type === 'json') {
    return (
      <div>
        {label}
        <JsonField value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div>
        {label}
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1.5 text-sm"
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
    );
  }

  return (
    <div>
      {label}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={(e) =>
          onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
        }
        className="w-full rounded border px-2 py-1.5 text-sm"
      />
    </div>
  );
}

/** Edits structured props (arrays/objects) as JSON, committing on valid parse. */
function JsonField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  return (
    <textarea
      defaultValue={JSON.stringify(value ?? null, null, 2)}
      rows={8}
      onBlur={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
          e.target.setCustomValidity('');
        } catch {
          e.target.setCustomValidity('Invalid JSON');
          e.target.reportValidity();
        }
      }}
      className="w-full rounded border px-2 py-1.5 font-mono text-xs"
    />
  );
}
