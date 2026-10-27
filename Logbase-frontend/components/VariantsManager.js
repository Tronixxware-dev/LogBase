'use client';

import { useState } from 'react';
import { useUser } from '@/components/UserProvider';
import { inputClass } from '@/components/ui';

// The colour / size's own code and prices, tucked under its row. An empty price means "use the product's price".
function RowExtras({ row, onChange, tone = '' }) {
  const { isOwner } = useUser();
  const filled = Boolean(row.sku) || (row.sellingPrice ?? '') !== '' || (row.costPrice ?? '') !== '';
  const [open, setOpen] = useState(filled);
  return (
    <div className="col-span-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs font-medium text-gray-500 hover:text-primary"
      >
        {open ? '▾' : '▸'} Code &amp; price{filled && !open ? ' (set)' : ''}
      </button>
      {open && (
        <div className={`mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3`}>
          <label className="block text-xs text-gray-500">
            Code (SKU)
            <input
              type="text"
              value={row.sku ?? ''}
              onChange={(e) => onChange('sku', e.target.value)}
              className={`${inputClass} mt-1 ${tone}`}
            />
          </label>
          <label className="block text-xs text-gray-500">
            Selling price (₦)
            <input
              type="number"
              min="0"
              value={row.sellingPrice ?? ''}
              onChange={(e) => onChange('sellingPrice', e.target.value)}
              placeholder="Same as the product"
              className={`${inputClass} mt-1 ${tone}`}
            />
          </label>
          {isOwner && (
            <label className="block text-xs text-gray-500">
              Cost price (₦)
              <input
                type="number"
                min="0"
                value={row.costPrice ?? ''}
                onChange={(e) => onChange('costPrice', e.target.value)}
                placeholder="Same as the product"
                className={`${inputClass} mt-1 ${tone}`}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// Colour / size rows for the product page. Nothing is sent to the server from here;
// the product page's Save button saves every change at once.
//
// rows:          existing variants  [{ id, color, size, quantity, sku, sellingPrice, costPrice, removed }]
// newRows:       rows added but not saved yet  [{ key, color, size, quantity, sku, sellingPrice, costPrice }]
// onRowChange:   (id, field, value)
// onRowRemove:   (id, removed)   mark / unmark an existing row for removal
// onNewChange:   (key, field, value)
// onNewRemove:   (key)
// onAddRow:      add a blank new row
// stockLocked:   the stock numbers cannot be typed here (a business with several stores changes a store's count with Adjust stock)
export default function VariantsManager({
  rows,
  newRows,
  onRowChange,
  onRowRemove,
  onNewChange,
  onNewRemove,
  onAddRow,
  stockLocked = false,
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
                disabled={stockLocked}
                className={`${inputClass}${stockLocked ? ' bg-gray-50' : ''}`}
              />
              <button
                type="button"
                onClick={() => onRowRemove(row.id, true)}
                aria-label="Remove colour / size"
                className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-600"
              >
                ×
              </button>
              <RowExtras row={row} onChange={(field, value) => onRowChange(row.id, field, value)} />
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
              disabled={stockLocked}
              className={`${inputClass} border-primary${stockLocked ? ' bg-gray-50' : ''}`}
            />
            <button
              type="button"
              onClick={() => onNewRemove(row.key)}
              aria-label="Cancel new row"
              className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-600"
            >
              ×
            </button>
            <RowExtras row={row} tone="border-primary" onChange={(field, value) => onNewChange(row.key, field, value)} />
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
