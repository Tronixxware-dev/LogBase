'use client';

import { useState } from 'react';
import { MEASURE_GROUPS, filledRows, rowsFor, unitShort } from '@/lib/tailor';
import { Icon } from '@/components/Icons';
import { Field, inputClass } from '@/components/ui';

// Small pieces of the tailor pages: the measurement boxes and the form for one garment.
// Used by the new-order page and by the order page (where a garment can be added or changed).

let counter = 0;
const nextKey = () => {
  counter += 1;
  return `piece-${Date.now()}-${counter}`;
};

export function emptyPiece() {
  return { key: nextKey(), style: '', quantity: '1', price: '', fabricFrom: 'customer', fabric: '', details: '', rows: [], worker: '', pay: '', _styleId: '' };
}

// A garment already on an order, as the form shows it
export function pieceFromOrder(p, styles) {
  const style = (styles || []).find((s) => s.name.toLowerCase() === String(p.style).toLowerCase());
  return {
    key: p._id || nextKey(),
    style: p.style || '',
    quantity: String(p.quantity || 1),
    price: p.price ? String(p.price) : '',
    fabricFrom: p.fabricFrom || 'customer',
    fabric: p.fabric || '',
    details: p.details || '',
    rows: rowsFor(style ? style.measures : [], p.measurements || []),
    worker: p.worker || '',
    pay: p.pay ? String(p.pay) : '',
    _styleId: style ? style._id : '',
  };
}

// What the server wants for a garment
export function pieceToPayload(p, { isOwner } = {}) {
  const payload = {
    style: p.style.trim(),
    quantity: Math.floor(Number(p.quantity)) || 1,
    price: Number(p.price) || 0,
    fabricFrom: p.fabricFrom,
    fabric: p.fabric.trim(),
    details: p.details.trim(),
    measurements: filledRows(p.rows),
    worker: p.worker || '',
  };
  if (isOwner && p.worker && String(p.pay).trim() !== '') payload.pay = Number(p.pay);
  return payload;
}

// Picks a garment from the price list: its price and the measurement boxes it needs
export function applyStyle(piece, style) {
  const filled = filledRows(piece.rows);
  return {
    ...piece,
    style: style.name,
    _styleId: style._id,
    price: style.price > 0 && (!piece.price || piece._styleId !== style._id) ? String(style.price) : piece.price,
    rows: rowsFor(style.measures || [], filled),
  };
}

// The boxes for the measurements: a name and a number each, with buttons to add the ones a garment needs
export function MeasureEditor({ rows, onChange, unit }) {
  const [custom, setCustom] = useState('');
  const have = new Set(rows.map((r) => r.name.toLowerCase()));

  function setValue(index, value) {
    onChange(rows.map((r, i) => (i === index ? { ...r, value } : r)));
  }
  function add(name) {
    const clean = name.trim();
    if (!clean || have.has(clean.toLowerCase())) return;
    onChange([...rows, { name: clean, value: '' }]);
  }

  return (
    <div>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">No measurements yet. Pick a garment from the list, or add the measurements below.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((r, i) => (
            <label key={r.name} className="relative block">
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-gray-500">
                <span className="truncate">{r.name}</span>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  aria-label={`Remove ${r.name}`}
                  className="ml-1 shrink-0 text-gray-300 hover:text-red-500"
                >
                  ×
                </button>
              </span>
              <span className="relative block">
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={16}
                  value={r.value}
                  onChange={(e) => setValue(i, e.target.value)}
                  aria-label={`${r.name} (${unitShort(unit)})`}
                  className={`${inputClass} !py-2 pr-9`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">{unitShort(unit)}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <details className="mt-3 rounded-lg border border-dashed border-gray-300 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-primary">+ Add another measurement</summary>
        <div className="mt-3 space-y-3">
          {MEASURE_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.names.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={have.has(n.toLowerCase())}
                    onClick={() => add(n)}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition hover:border-primary hover:text-primary disabled:opacity-40"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="text" maxLength={40} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or type your own, e.g. Cap size" className={`${inputClass} !py-2`} />
            <button
              type="button"
              onClick={() => {
                add(custom);
                setCustom('');
              }}
              className="shrink-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              Add
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

// The form for one garment: what, how many, the price, the cloth, the style details, the measurements and who sews it.
//   styles:   the price list    tailors: the active tailors    saved: the customer's saved measurement sets
export function PieceForm({ piece, onChange, onRemove, index, styles, tailors, saved = [], unit, isOwner, canRemove = true }) {
  const set = (patch) => onChange({ ...piece, ...patch });
  const listId = `styles-${piece.key}`;

  function typeStyle(text) {
    const match = (styles || []).find((s) => s.name.toLowerCase() === text.trim().toLowerCase());
    if (match) onChange(applyStyle({ ...piece, style: text }, match));
    else set({ style: text, _styleId: '' });
  }

  // A saved set fills the boxes this garment shows. A garment with no boxes yet (a style typed by hand) takes the whole set.
  function useSaved(saved_) {
    const rows = piece.rows.map((r) => ({ ...r }));
    for (const v of saved_.values) {
      const i = rows.findIndex((r) => r.name.toLowerCase() === v.name.toLowerCase());
      if (i >= 0) rows[i].value = v.value;
      else if (piece.rows.length === 0) rows.push({ name: v.name, value: v.value });
    }
    set({ rows });
  }

  const tailor = (tailors || []).find((t) => t._id === piece.worker);

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-white">
            <Icon name="scissors" className="h-4 w-4" />
          </span>
          Garment {index + 1}
        </p>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-medium text-red-600 hover:underline">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Field label="What to sew" hint="Pick from your list or type it.">
            <input type="text" list={listId} maxLength={80} value={piece.style} onChange={(e) => typeStyle(e.target.value)} className={inputClass} placeholder="e.g. Agbada" required />
            <datalist id={listId}>
              {(styles || []).filter((s) => s.isActive !== false).map((s) => (
                <option key={s._id} value={s.name} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="How many">
          <input type="number" min="1" step="1" value={piece.quantity} onChange={(e) => set({ quantity: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Price, each (₦)">
          <input type="number" min="0" step="any" value={piece.price} onChange={(e) => set({ price: e.target.value })} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Who supplied the cloth?">
          <select value={piece.fabricFrom} onChange={(e) => set({ fabricFrom: e.target.value })} className={inputClass}>
            <option value="customer">The customer brought it</option>
            <option value="shop">We supply the cloth</option>
          </select>
        </Field>
        <Field label="Cloth (optional)" hint="Kind and amount, e.g. 6 yards guinea brocade.">
          <input type="text" maxLength={120} value={piece.fabric} onChange={(e) => set({ fabric: e.target.value })} className={inputClass} />
        </Field>
      </div>

      <Field label="How it should look (optional)" hint="Neckline, sleeves, buttons, embroidery, lining…">
        <textarea rows={2} maxLength={500} value={piece.details} onChange={(e) => set({ details: e.target.value })} className={inputClass} />
      </Field>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Icon name="ruler" className="h-4 w-4 text-primary" />
            Measurements <span className="text-xs font-normal text-gray-400">({unit === 'cm' ? 'centimetres' : 'inches'})</span>
          </p>
          {saved.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-gray-400">Use saved:</span>
              {saved.map((s) => (
                <button key={s._id} type="button" onClick={() => useSaved(s)} className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/15">
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <MeasureEditor rows={piece.rows} onChange={(rows) => set({ rows })} unit={unit} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tailor (optional)" hint="Who is sewing it. You can choose later.">
          <select value={piece.worker} onChange={(e) => set({ worker: e.target.value, pay: '' })} className={inputClass}>
            <option value="">Not assigned yet</option>
            {(tailors || []).map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
                {t.role ? ` (${t.role})` : ''}
              </option>
            ))}
          </select>
        </Field>
        {isOwner && piece.worker && (
          <Field label="Their pay for this garment (₦)" hint={tailor && tailor.rate > 0 ? `Empty = the pay on your price list, or their usual ₦${tailor.rate.toLocaleString()} each.` : 'Empty = the pay on your price list, or their usual rate.'}>
            <input type="number" min="0" step="any" value={piece.pay} onChange={(e) => set({ pay: e.target.value })} className={inputClass} />
          </Field>
        )}
      </div>
    </div>
  );
}
