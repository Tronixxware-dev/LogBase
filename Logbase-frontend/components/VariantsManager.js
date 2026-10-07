'use client';

import { inputClass } from '@/components/ui';

// Colour / size rows for the product page. Nothing is sent to the server from here;
// the product page's Save button saves every change at once.
//
// rows:          existing variants  [{ id, color, size, quantity, removed }]
// newRows:       rows added but not saved yet  [{ key, color, size, quantity }]
// onRowChange:   (id, field, value)
// onRowRemove:   (id, removed)   mark / unmark an existing row for removal
// onNewChange:   (key, field, value)
// onNewRemove:   (key)
// onAddRow:      add a blank new row
export default function VariantsManager({
  rows,
  newRows,
  onRowChange,
  onRowRemove,
  onNewChange,
  onNewRemove,
  onAddRow,
}) {
  const total =
    rows.filter((r) => !r.removed).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) +
    newRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  const hasAny = rows.length > 0 || newRows.length > 0;

  return (
    <div>
      {!hasAny && (
        <p className="mb-4 text-sm text-gray-500">
          This product has no colours or sizes. Add one below if it comes in different colours or sizes — the
          stock you already have will be moved to the first one.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row) =>
          row.removed ? (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <span className="line-through">
                {[row.color, row.size].filter(Boolean).join(' / ')} — will be removed when you save
              </span>
              <button type="button" onClick={() => onRowRemove(row.id, false)} className="underline">
                Undo
              </button>
            </div>
          ) : (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2"
            >
              <input
                type="text"
                value={row.color}
                onChange={(e) => onRowChange(row.id, 'color', e.target.value)}
                placeholder="Colour"
                aria-label="Colour"
                className={inputClass}
              />
              <input
                type="text"
                value={row.size}
                onChange={(e) => onRowChange(row.id, 'size', e.target.value)}
                placeholder="Size"
                aria-label="Size"
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                value={row.quantity}
                onChange={(e) => onRowChange(row.id, 'quantity', e.target.value)}
                placeholder="Qty"
                aria-label="Stock"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => onRowRemove(row.id, true)}
                aria-label="Remove colour / size"
                className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-600"
              >
                ×
              </button>
            </div>
          )
        )}

        {newRows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2">
            <input
              type="text"
              value={row.color}
              onChange={(e) => onNewChange(row.key, 'color', e.target.value)}
              placeholder="New colour"
              aria-label="Colour"
              className={`${inputClass} border-primary`}
            />
            <input
              type="text"
              value={row.size}
              onChange={(e) => onNewChange(row.key, 'size', e.target.value)}
              placeholder="Size"
              aria-label="Size"
              className={`${inputClass} border-primary`}
            />
            <input
              type="number"
              min="0"
              value={row.quantity}
              onChange={(e) => onNewChange(row.key, 'quantity', e.target.value)}
              placeholder="Qty"
              aria-label="Stock"
              className={`${inputClass} border-primary`}
            />
            <button
              type="button"
              onClick={() => onNewRemove(row.key)}
              aria-label="Cancel new row"
              className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={onAddRow} className="text-sm text-primary hover:text-primary-dark">
          + Add colour / size
        </button>
        {hasAny && (
          <span className="text-sm text-gray-500">
            Total stock: <span className="font-medium text-gray-900">{total}</span>
          </span>
        )}
      </div>
    </div>
  );
}
