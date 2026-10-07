'use client';

import { useMemo, useState } from 'react';
import { createReturn } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { previewReturn, RETURN_REASONS, REFUND_METHODS } from '@/lib/returns';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

function lineName(line) {
  const name = line.product?.name || 'Item';
  return line.variantLabel ? `${name} · ${line.variantLabel}` : name;
}

// "Return items" on a sale: say how many of each line come back, why, and how the customer is paid back.
// `lines` are the sale lines (one, or every line of a multi-item sale). `onDone` runs after a return is saved.
export default function ReturnPanel({ lines, hasCustomer, onDone }) {
  const returnable = lines.filter((l) => l.quantity > 0);
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState({});
  // for items sold with IMEI / serial numbers: which of those numbers are coming back, per sale line
  const [picked, setPicked] = useState({});
  const [reason, setReason] = useState('defective');
  const [restock, setRestock] = useState(true);
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const preview = useMemo(() => previewReturn(returnable, wanted), [returnable, wanted]);

  if (returnable.length === 0) {
    return null;
  }

  function setQty(id, max, raw) {
    setConfirming(false);
    if (raw === '') {
      setWanted((w) => ({ ...w, [id]: '' }));
      return;
    }
    const n = Math.max(0, Math.min(max, Number(raw)));
    setWanted((w) => ({ ...w, [id]: Number.isFinite(n) ? n : 0 }));
  }

  function toggleSerial(line, serial) {
    setConfirming(false);
    const current = picked[line._id] || [];
    const next = current.includes(serial) ? current.filter((s) => s !== serial) : [...current, serial];
    setPicked((p) => ({ ...p, [line._id]: next }));
    setWanted((w) => ({ ...w, [line._id]: next.length }));
  }

  function returnAll() {
    setConfirming(false);
    const all = {};
    const allSerials = {};
    returnable.forEach((l) => {
      all[l._id] = l.quantity;
      if (l.serials?.length > 0) allSerials[l._id] = [...l.serials];
    });
    setWanted(all);
    setPicked(allSerials);
  }

  async function submit() {
    setError('');
    if (preview.units <= 0) {
      setError('Enter how many of each item are coming back');
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    try {
      const items = returnable
        .filter((l) => Number(wanted[l._id]) > 0)
        .map((l) => ({
          sale: l._id,
          quantity: Number(wanted[l._id]),
          ...(l.serials?.length > 0 ? { serials: picked[l._id] || [] } : {}),
        }));
      await createReturn({
        items,
        reason,
        restock,
        note: note.trim(),
        refundMethod: preview.refund > 0 ? method : undefined,
      });
      const message = `Return saved: ${formatMoney(preview.value)} taken back${
        preview.refund > 0 ? ` (${formatMoney(preview.refund)} to give back to the customer)` : ''
      }.`;
      setDone(message);
      setOpen(false);
      setWanted({});
      setPicked({});
      setNote('');
      setConfirming(false);
      if (onDone) await onDone(message);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${cardClass} mb-6 p-6 print:hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Return items</h2>
          <p className="text-xs text-gray-400">
            The customer brings something back. The sale, the stock and what they owe are updated for you.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setDone('');
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Start a return
          </button>
        )}
      </div>

      {done && !open && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{done}</p>}

      {open && (
        <div className="mt-5">
          <ErrorBanner message={error} />

          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {returnable.map((line) => (
              <li key={line._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium text-gray-900">{lineName(line)}</span>
                  <span className="block text-xs text-gray-400">
                    {line.quantity} left to return · {formatMoney(line.unitPrice)} each
                  </span>
                </span>
                {line.serials?.length > 0 ? (
                  <fieldset className="w-full">
                    <legend className="mb-1 text-xs text-gray-500">Which units are coming back? (IMEI / serial number)</legend>
                    <div className="flex flex-wrap gap-2">
                      {line.serials.map((serial) => {
                        const on = (picked[line._id] || []).includes(serial);
                        return (
                          <label
                            key={serial}
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-xs ${
                              on ? 'border-primary bg-gray-100 text-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <input type="checkbox" checked={on} onChange={() => toggleSerial(line, serial)} />
                            {serial}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <span className="flex items-center gap-2">
                    <label htmlFor={`ret-${line._id}`} className="text-xs text-gray-500">
                      Bringing back
                    </label>
                    <input
                      id={`ret-${line._id}`}
                      type="number"
                      min="0"
                      max={line.quantity}
                      value={wanted[line._id] ?? ''}
                      onChange={(e) => setQty(line._id, line.quantity, e.target.value)}
                      className={`${inputClass} w-24`}
                      placeholder="0"
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button type="button" onClick={returnAll} className="mt-2 text-sm font-medium text-primary hover:underline">
            Return everything
          </button>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Why is it coming back?">
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setConfirming(false);
                }}
                className={inputClass}
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note (optional)">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                className={inputClass}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => {
                setRestock(e.target.checked);
                setConfirming(false);
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary"
            />
            <span>
              Put the items back in stock
              <span className="block text-xs text-gray-400">
                Untick this when they are damaged and cannot be sold again. Their cost is then counted as a loss.
              </span>
            </span>
          </label>

          {preview.units > 0 && (
            <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm">
              <p className="flex justify-between">
                <span className="text-gray-500">Value of the items coming back</span>
                <span className="font-semibold text-gray-900">{formatMoney(preview.value)}</span>
              </p>
              {preview.owedReduction > 0 && (
                <p className="mt-1 flex justify-between">
                  <span className="text-gray-500">Taken off what the customer still owes</span>
                  <span className="font-medium text-gray-900">{formatMoney(preview.owedReduction)}</span>
                </p>
              )}
              {preview.refund > 0 && (
                <p className="mt-1 flex justify-between">
                  <span className="text-gray-500">Already paid, to give back</span>
                  <span className="font-medium text-gray-900">{formatMoney(preview.refund)}</span>
                </p>
              )}
              {preview.refund > 0 && (
                <div className="mt-3">
                  <Field label="How do you give it back?">
                    <select
                      value={method}
                      onChange={(e) => {
                        setMethod(e.target.value);
                        setConfirming(false);
                      }}
                      className={inputClass}
                    >
                      {REFUND_METHODS.filter((m) => m.value !== 'credit' || hasCustomer).map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={submit} disabled={saving} className={primaryButtonClass}>
              {saving ? 'Saving…' : confirming ? `Confirm: take back ${formatMoney(preview.value)}` : 'Return items'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirming(false);
                setError('');
              }}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
            {confirming && <span className="text-xs text-amber-700">A return cannot be undone. Tap again to confirm.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
