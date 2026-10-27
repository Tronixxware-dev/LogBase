'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addProductSerials, listProductSerials, removeSerialUnit, updateSerialUnit } from '@/lib/api';
import { normalizeSerial, SERIAL_STATUS } from '@/lib/serials';
import { formatDate } from '@/lib/format';
import SerialsInput from '@/components/SerialsInput';
import { ErrorBanner, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

const PAGE = 40;

// The IMEI / serial numbers of one product, on the product page: see them, add the numbers of pieces already on the shelf,
// correct a mistyped number (or its colour / size) and take a wrong one off the record.
// A sold unit belongs to a sale, so it can only be looked at. Every button here saves at once (it does not wait for "Save changes").
export default function ProductSerials({ product, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState([]);
  const [addVariant, setAddVariant] = useState('');
  const [busy, setBusy] = useState('');
  const [editId, setEditId] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editVariant, setEditVariant] = useState('');
  const [filter, setFilter] = useState('');
  const [shown, setShown] = useState(PAGE);

  const variants = useMemo(() => product.variants || [], [product.variants]);
  const hasVariants = variants.length > 0;

  const load = useCallback(() => {
    return listProductSerials(product._id)
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [product._id]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // with colours / sizes a new number must say which one it belongs to; it starts on the first
  const chosenVariant = variants.some((v) => v._id === addVariant) ? addVariant : variants[0] ? variants[0]._id : '';

  async function run(key, task, done) {
    setError('');
    setNotice('');
    setBusy(key);
    try {
      await task();
      await load();
      if (done) setNotice(done);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy('');
    }
  }

  async function handleAdd() {
    if (adding.length === 0) return;
    const count = adding.length;
    const ok = await run('add', () => addProductSerials(product._id, { serials: adding, ...(hasVariants ? { variant: chosenVariant } : {}) }), `${count} number${count === 1 ? '' : 's'} recorded`);
    if (ok) setAdding([]);
  }

  function startEdit(u) {
    setError('');
    setNotice('');
    setEditId(u._id);
    setEditSerial(u.serial);
    setEditVariant(u.variant || '');
  }

  async function handleSaveEdit(u) {
    const wanted = normalizeSerial(editSerial);
    if (!wanted) {
      setError('That is not a valid IMEI / serial number (3 to 40 letters, digits, - _ . /)');
      return;
    }
    const body = {};
    if (wanted !== u.serial) body.serial = wanted;
    if (hasVariants && editVariant && editVariant !== (u.variant || '')) body.variant = editVariant;
    if (Object.keys(body).length === 0) {
      setEditId('');
      return;
    }
    const ok = await run(u._id, () => updateSerialUnit(u._id, body), 'Saved');
    if (ok) setEditId('');
  }

  async function handleRemove(u) {
    const sure = window.confirm(
      `Take ${u.serial} off the record? The number is forgotten; the stock count of ${product.name} does not change. You can record it again later.`
    );
    if (!sure) return;
    await run(u._id, () => removeSerialUnit(u._id), 'Removed');
  }

  const units = useMemo(() => {
    const list = (data && data.units) || [];
    const q = filter.trim().toUpperCase().replace(/\s+/g, '');
    return q ? list.filter((u) => u.serial.includes(q) || (u.variantLabel || '').toUpperCase().includes(q)) : list;
  }, [data, filter]);

  const groups = (data && data.groups) || [];
  const missing = groups.reduce((sum, g) => sum + Math.max(0, g.held - g.recorded), 0);
  const canAddMore = missing > 0;

  return (
    <div className={`${cardClass} mb-6 p-6`}>
      <h2 className="mb-1 text-lg font-medium text-gray-900">IMEI / serial numbers</h2>
      <p className="mb-4 text-sm text-gray-500">
        Correct a mistyped number, take a wrong one off, or record the numbers of pieces you already have. These buttons save straight away.
      </p>

      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      {!data ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <ul className="mb-4 space-y-1 text-sm text-gray-600">
            {groups.map((g) => (
              <li key={g.variant || 'all'}>
                {g.label ? <span className="font-medium text-gray-900">{g.label}: </span> : null}
                {g.recorded} of {g.held} piece{g.held === 1 ? '' : 's'} in {data.store} {g.recorded === 1 ? 'has' : 'have'} a number on record
              </li>
            ))}
          </ul>

          {canAddMore ? (
            <div className="mb-5 rounded-xl border border-gray-200 p-4">
              <p className="mb-2 text-sm font-medium text-gray-900">Add numbers</p>
              {hasVariants && (
                <select value={chosenVariant} onChange={(e) => setAddVariant(e.target.value)} className={`${inputClass} mb-2 sm:max-w-xs`} aria-label="Colour / size">
                  {variants.map((v) => (
                    <option key={v._id} value={v._id}>
                      {[v.color, v.size].filter(Boolean).join(' / ')}
                    </option>
                  ))}
                </select>
              )}
              <SerialsInput value={adding} onChange={setAdding} disabled={busy === 'add'} />
              <button type="button" onClick={handleAdd} disabled={busy === 'add' || adding.length === 0} className={`${primaryButtonClass} mt-3`}>
                {busy === 'add' ? 'Saving…' : `Record ${adding.length || ''} number${adding.length === 1 ? '' : 's'}`.replace('  ', ' ')}
              </button>
            </div>
          ) : (
            <p className="mb-5 text-sm text-gray-500">Every piece in stock already has a number. To record more, receive the stock first (a purchase or Adjust stock).</p>
          )}

          {(data.units || []).length > 6 && (
            <input
              type="search"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setShown(PAGE);
              }}
              placeholder="Search these numbers"
              aria-label="Search these numbers"
              className={`${inputClass} mb-3 sm:max-w-xs`}
            />
          )}

          {(data.units || []).length === 0 ? (
            <p className="text-sm text-gray-500">No numbers recorded for this product yet.</p>
          ) : units.length === 0 ? (
            <p className="text-sm text-gray-500">No number matches.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {units.slice(0, shown).map((u) => {
                const status = SERIAL_STATUS[u.status] || SERIAL_STATUS.in_stock;
                const editable = u.status !== 'sold' && !u.inTransit;
                const editing = editId === u._id;
                return (
                  <li key={u._id} className="px-3 py-2.5">
                    {editing ? (
                      <div className="space-y-2">
                        <input
                          value={editSerial}
                          onChange={(e) => setEditSerial(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(u);
                            }
                          }}
                          aria-label="Corrected number"
                          className={`${inputClass} font-mono`}
                          autoFocus
                        />
                        {hasVariants && (
                          <select value={editVariant} onChange={(e) => setEditVariant(e.target.value)} className={inputClass} aria-label="Colour / size">
                            {variants.map((v) => (
                              <option key={v._id} value={v._id}>
                                {[v.color, v.size].filter(Boolean).join(' / ')}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleSaveEdit(u)} disabled={busy === u._id} className={primaryButtonClass}>
                            {busy === u._id ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" onClick={() => setEditId('')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="min-w-0 break-all font-mono text-sm font-medium text-gray-900">{u.serial}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                        {u.variantLabel && <span className="text-xs text-gray-500">{u.variantLabel}</span>}
                        {u.store && <span className="text-xs text-gray-500">{u.store}</span>}
                        {u.status === 'sold' && (
                          <span className="text-xs text-gray-500">
                            Sold {u.soldAt ? formatDate(u.soldAt) : ''}
                            {u.customerName ? ` to ${u.customerName}` : ''}
                          </span>
                        )}
                        <span className="ml-auto flex gap-2">
                          {editable ? (
                            <>
                              <button type="button" onClick={() => startEdit(u)} disabled={Boolean(busy)} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
                                Edit
                              </button>
                              <button type="button" onClick={() => handleRemove(u)} disabled={Boolean(busy)} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
                                {busy === u._id ? 'Removing…' : 'Remove'}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">{u.status === 'sold' ? 'Sold: cannot be changed' : 'On its way between stores'}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {units.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 text-sm font-medium text-primary hover:underline">
              Show more ({units.length - shown} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}
