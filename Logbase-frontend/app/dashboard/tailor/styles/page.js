'use client';

import { useEffect, useState } from 'react';
import { createTailorStyle, deleteTailorStyle, listTailorStyles, updateTailorStyle } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { MEASURE_GROUPS } from '@/lib/tailor';
import PageHeader from '@/components/PageHeader';
import { Icon } from '@/components/Icons';
import { ErrorBanner, EmptyState, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

// The price list of garments (owner only): what each costs, what the tailor usually earns for it, and which measurements it needs.
export default function TailorStylesPage() {
  const [styles, setStyles] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // a style, or 'new'
  const [showOff, setShowOff] = useState(false);

  function load() {
    listTailorStyles()
      .then((d) => {
        setStyles(d.styles || []);
        setError('');
      })
      .catch((err) => setError(err.message));
  }
  useEffect(load, []);

  function done(message) {
    setEditing(null);
    setNotice(message);
    load();
    setTimeout(() => setNotice(''), 3000);
  }

  const list = styles || [];
  const active = list.filter((s) => s.isActive !== false);
  const off = list.filter((s) => s.isActive === false);
  const shown = showOff ? list : active;

  return (
    <>
      <PageHeader
        title="Styles & prices"
        subtitle="Your price list of garments. Pick one on an order and its price and measurement boxes fill in by themselves."
        action={
          !editing ? (
            <button type="button" onClick={() => setEditing('new')} className={primaryButtonClass}>
              <Icon name="plus" className="h-4 w-4" />
              Add a garment
            </button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {editing && <StyleForm style={editing === 'new' ? null : editing} onDone={done} onCancel={() => setEditing(null)} />}

      {styles === null ? (
        <LoadingState />
      ) : shown.length === 0 ? (
        <EmptyState icon="scissors" message="No garment on the list yet." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((s) => (
            <li key={s._id} className={`${cardClass} p-4 ${s.isActive === false ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {s.name}
                    {s.isActive === false && <span className="ml-2 text-xs font-normal text-gray-400">hidden</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.price > 0 ? formatMoney(s.price) : 'No price set'}
                    {s.pay > 0 ? ` · tailor earns ${formatMoney(s.pay)}` : ''}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">{(s.measures || []).join(', ') || 'No measurements chosen'}</p>
                </div>
                <button type="button" onClick={() => { setEditing(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="shrink-0 text-xs font-medium text-primary hover:underline">
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {off.length > 0 && (
        <button type="button" onClick={() => setShowOff((v) => !v)} className="mt-4 text-sm font-medium text-gray-500 hover:underline">
          {showOff ? 'Hide' : 'Show'} {off.length} hidden
        </button>
      )}
    </>
  );
}

function StyleForm({ style, onDone, onCancel }) {
  const [name, setName] = useState(style ? style.name : '');
  const [price, setPrice] = useState(style && style.price > 0 ? String(style.price) : '');
  const [pay, setPay] = useState(style && style.pay > 0 ? String(style.pay) : '');
  const [measures, setMeasures] = useState(style ? style.measures || [] : []);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [asking, setAsking] = useState(false);

  const has = (n) => measures.some((m) => m.toLowerCase() === n.toLowerCase());
  function toggle(n) {
    setMeasures(has(n) ? measures.filter((m) => m.toLowerCase() !== n.toLowerCase()) : [...measures, n]);
  }
  function addCustom() {
    const n = custom.trim();
    if (n && !has(n)) setMeasures([...measures, n]);
    setCustom('');
  }
  const extra = measures.filter((m) => !MEASURE_GROUPS.some((g) => g.names.some((n) => n.toLowerCase() === m.toLowerCase())));

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    if (!name.trim()) return setProblem('Enter the name of the garment');
    const payload = { name, price: Number(price) || 0, pay: Number(pay) || 0, measures };
    setBusy(true);
    try {
      if (style) await updateTailorStyle(style._id, payload);
      else await createTailorStyle(payload);
      onDone(style ? 'Garment updated' : 'Garment added');
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
    }
  }

  async function toggleActive() {
    setBusy(true);
    try {
      await updateTailorStyle(style._id, { isActive: style.isActive === false });
      onDone(style.isActive === false ? 'Garment is back on the list' : 'Garment hidden from new orders');
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteTailorStyle(style._id);
      onDone('Garment removed from the list');
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${cardClass} mb-6 space-y-4 p-5`}>
      <h2 className="text-lg font-medium text-gray-900">{style ? `Change ${style.name}` : 'Add a garment'}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Garment">
          <input type="text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Agbada" required />
        </Field>
        <Field label="Usual price (₦)">
          <input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Tailor's usual pay (₦)" hint="Only you see this.">
          <input type="number" min="0" step="any" value={pay} onChange={(e) => setPay(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Measurements this garment needs</p>
        <div className="space-y-3 rounded-lg border border-gray-200 p-3">
          {MEASURE_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.names.map((n) => (
                  <button key={n} type="button" onClick={() => toggle(n)} aria-pressed={has(n)} className={`rounded-full border px-2.5 py-1 text-xs transition ${has(n) ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {extra.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Your own</p>
              <div className="flex flex-wrap gap-1.5">
                {extra.map((n) => (
                  <button key={n} type="button" onClick={() => toggle(n)} className="rounded-full border border-primary bg-primary px-2.5 py-1 text-xs text-white">
                    {n} ×
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" maxLength={40} value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Or type your own, e.g. Cap size" className={`${inputClass} !py-2`} />
            <button type="button" onClick={addCustom} className="shrink-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50">
              Add
            </button>
          </div>
        </div>
      </div>

      {problem && <p className="text-sm text-red-600">{problem}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
        {style && (
          <span className="ml-auto flex items-center gap-4 text-sm">
            <button type="button" disabled={busy} onClick={toggleActive} className="font-medium text-gray-600 hover:underline">
              {style.isActive === false ? 'Show again' : 'Hide from new orders'}
            </button>
            {asking ? (
              <span className="flex items-center gap-2">
                <span className="text-gray-600">Remove for good?</span>
                <button type="button" disabled={busy} onClick={remove} className="font-medium text-red-600 hover:underline">
                  Yes
                </button>
                <button type="button" onClick={() => setAsking(false)} className="text-gray-500 hover:underline">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setAsking(true)} className="font-medium text-red-600 hover:underline">
                Remove
              </button>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
