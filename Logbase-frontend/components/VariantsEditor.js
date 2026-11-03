'use client';

import { useId } from 'react';
import { Suggestions, useHints } from '@/components/HintLists';
import { inputClass } from '@/components/ui';

let counter = 0;

// A blank row for the editor. `key` is only used by React to track rows.
export function newVariantRow() {
  counter += 1;
  return { key: `v${counter}`, color: '', size: '', quantity: '' };
}

// Used when creating a product: lets you list every colour / size and how many of each you have.
// rows:     [{ key, color, size, quantity }]
// onChange: called with the new rows array
export default function VariantsEditor({ rows, onChange }) {
  const { hints } = useHints();
  const colourListId = useId();
  const sizeListId = useId();
  function update(key, field, value) {
    onChange(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function remove(key) {
    onChange(rows.filter((r) => r.key !== key));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_1fr_5rem_auto]">
          <input
            type="text"
            value={row.color}
            onChange={(e) => update(row.key, 'color', e.target.value)}
            placeholder={hints.colourPlaceholder}
            list={colourListId}
            autoComplete="off"
            className={`${inputClass} col-span-2 sm:col-span-1`}
          />
          <input
            type="text"
            value={row.size}
            onChange={(e) => update(row.key, 'size', e.target.value)}
            placeholder={hints.sizePlaceholder}
            list={sizeListId}
            autoComplete="off"
            className={`${inputClass} col-span-2 sm:col-span-1`}
          />
          <input
            type="number"
            min="0"
            value={row.quantity}
            onChange={(e) => update(row.key, 'quantity', e.target.value)}
            placeholder="Qty"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => remove(row.key)}
            aria-label="Remove variant"
            className="h-8 w-8 justify-self-end rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-600 sm:justify-self-auto"
          >
            ×
          </button>
        </div>
      ))}

      <Suggestions id={colourListId} options={hints.colourOptions} />
      <Suggestions id={sizeListId} options={hints.sizeOptions} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange([...rows, newVariantRow()])}
          className="text-sm text-primary hover:text-primary-dark"
        >
          + Add another colour / {hints.sizeLabel.toLowerCase().replace(' / size', '')}
        </button>
        <span className="text-sm text-gray-500">
          Total stock: <span className="font-medium text-gray-900">{total}</span>
        </span>
      </div>
    </div>
  );
}
