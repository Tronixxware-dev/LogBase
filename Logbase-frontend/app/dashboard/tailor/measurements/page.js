'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteMeasurements, listMeasurements, saveMeasurements } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { UNITS, filledRows, unitShort } from '@/lib/tailor';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import CustomerPicker, { useCustomerPicker } from '@/components/CustomerPicker';
import { MeasureEditor } from '@/components/TailorParts';
import { Icon } from '@/components/Icons';
import { ErrorBanner, EmptyState, Field, ListTotal, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

// The measurement book: every customer's measurements, kept so nobody is measured twice.
export default function MeasurementsPage() {
  const { can } = useUser();
  const canWrite = can('recordSales');
  const [sets, setSets] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // a saved set being changed
  const latest = useRef(0);

  const load = useCallback((text) => {
    const ticket = (latest.current += 1);
    listMeasurements(text.trim() ? { search: text.trim() } : undefined)
      .then((d) => {
        if (ticket !== latest.current) return;
        setSets(d.measurements || []);
        setError('');
      })
      .catch((err) => {
        if (ticket === latest.current) setError(err.message);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, load]);

  function saved(message) {
    setNotice(message);
    setAdding(false);
    setEditing(null);
    load(search);
    setTimeout(() => setNotice(''), 3000);
  }

  return (
    <>
      <PageHeader
        title="Measurement book"
        subtitle="Every customer's measurements in one place. Take them once; use them on every order."
        action={
          canWrite && !adding && !editing ? (
            <button type="button" onClick={() => setAdding(true)} className={primaryButtonClass}>
              <Icon name="plus" className="h-4 w-4" />
              Add measurements
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

      {adding && <SetForm onDone={saved} onCancel={() => setAdding(false)} />}
      {editing && <SetForm existing={editing} onDone={saved} onCancel={() => setEditing(null)} />}

      <div className="mb-4">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer name, phone number or label" aria-label="Search measurements" className={inputClass} />
      </div>

      {sets === null ? (
        <LoadingState />
      ) : sets.length === 0 ? (
        <EmptyState icon="ruler" message={search ? 'No measurements match your search.' : 'No measurements saved yet. They are saved automatically when you take an order, or you can add them here.'} />
      ) : (
        <>
          <ListTotal count={sets.length} noun="set of measurements" plural="sets of measurements" />
          <ul className="space-y-3">
            {sets.map((m) => (
              <SetCard key={m._id} set={m} canWrite={canWrite} onEdit={() => { setAdding(false); setEditing(m); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDeleted={() => saved('Measurements deleted')} onError={setError} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function SetCard({ set, canWrite, onEdit, onDeleted, onError }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const unit = unitShort(set.unit);
  return (
    <li className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">
            {set.customerName || 'Customer'} <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{set.label}</span>
          </p>
          <p className="text-xs text-gray-400">
            {describePhone(set.customerPhone).display} · measured {formatDate(set.measuredAt)}
            {set.recordedByName ? ` by ${set.recordedByName}` : ''}
          </p>
        </div>
        {canWrite && (
          <div className="flex shrink-0 gap-3 text-xs">
            <button type="button" onClick={onEdit} className="font-medium text-primary hover:underline">
              Edit
            </button>
            {asking ? (
              <span className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await deleteMeasurements(set._id);
                      onDeleted();
                    } catch (err) {
                      onError(err.message);
                      setBusy(false);
                      setAsking(false);
                    }
                  }}
                  className="font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
                <button type="button" onClick={() => setAsking(false)} className="text-gray-500 hover:underline">
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setAsking(true)} className="font-medium text-red-600 hover:underline">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs sm:grid-cols-4">
        {(set.values || []).map((v) => (
          <div key={v.name} className="flex justify-between gap-2">
            <dt className="truncate text-gray-500">{v.name}</dt>
            <dd className="font-medium text-gray-900">
              {v.value} {unit}
            </dd>
          </div>
        ))}
      </dl>
      {set.notes && <p className="mt-2 text-xs text-gray-500">{set.notes}</p>}
    </li>
  );
}

// Add a new set (pick the customer) or change a saved one (the customer and label stay)
function SetForm({ existing, onDone, onCancel }) {
  const picker = useCustomerPicker();
  const [label, setLabel] = useState(existing ? existing.label : 'Main');
  const [unit, setUnit] = useState(existing ? existing.unit : 'in');
  const [rows, setRows] = useState(existing ? (existing.values || []).map((v) => ({ name: v.name, value: v.value })) : []);
  const [notes, setNotes] = useState(existing ? existing.notes || '' : '');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    const values = filledRows(rows);
    if (values.length === 0) return setProblem('Enter at least one measurement');
    if (!label.trim()) return setProblem('Give this set a name, e.g. Main or Her husband');
    if (!existing) {
      const p = picker.problem();
      if (p) return setProblem(p);
    }
    setBusy(true);
    try {
      const customer = existing ? { _id: existing.customer } : await picker.resolve();
      await saveMeasurements({ customer: customer._id, label: label.trim(), unit, values, notes: notes.trim() || undefined });
      onDone(existing ? 'Measurements updated' : 'Measurements saved');
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${cardClass} mb-6 space-y-4 p-5`}>
      <h2 className="text-lg font-medium text-gray-900">{existing ? `Change ${existing.customerName}'s measurements` : 'Add measurements'}</h2>
      {!existing && <CustomerPicker picker={picker} savedNote="They will be saved as a customer too." />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name of this set" hint="A customer can have several: Main, Her husband, Son…">
          <input type="text" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} disabled={!!existing} className={inputClass} />
        </Field>
        <Field label="Measured in">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <MeasureEditor rows={rows} onChange={setRows} unit={unit} />
      <Field label="Notes (optional)">
        <input type="text" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="e.g. Left shoulder is lower" />
      </Field>
      {problem && <p className="text-sm text-red-600">{problem}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : 'Save measurements'}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
