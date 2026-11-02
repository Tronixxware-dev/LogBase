'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createWorker, listWorkers, updateWorker } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { Icon } from '@/components/Icons';
import { StatTile } from '@/components/JobParts';
import { ErrorBanner, EmptyState, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

// The list of people who do the work and are paid for it: tailors (kind "tailor").
// The administrator sees what each is owed and can add, change and retire them; staff only see who they are.
const WORDS = {
  tailor: {
    title: 'Tailors & workers',
    subtitle: 'The people who cut, sew and embroider. See what each has earned, what you owe and what you have paid.',
    one: 'tailor',
    many: 'tailors',
    add: 'Add a tailor',
    roles: ['Tailor', 'Cutter', 'Embroiderer', 'Finisher', 'Apprentice'],
    rateLabel: 'Usual pay for one garment (₦)',
    rateHint: 'Used when you give them a garment without typing a pay. You can change it on any garment.',
    perJob: 'per garment',
    empty: 'No tailor added yet. Add the people who sew for you so you can give them garments and track what they earn.',
    icon: 'scissors',
  },
};

export default function WorkersManager({ kind }) {
  const w = WORDS[kind];
  const { isOwner } = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [editing, setEditing] = useState(null); // a worker, or 'new'

  function load() {
    listWorkers({ kind })
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.message));
  }
  useEffect(load, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  function done(message) {
    setEditing(null);
    setNotice(message);
    load();
    setTimeout(() => setNotice(''), 3000);
  }

  const workers = data ? data.workers : [];
  const active = workers.filter((x) => x.isActive !== false);
  const retired = workers.filter((x) => x.isActive === false);
  const shown = showOld ? workers : active;

  return (
    <>
      <PageHeader
        title={w.title}
        subtitle={w.subtitle}
        action={
          isOwner && !editing ? (
            <button type="button" onClick={() => setEditing('new')} className={primaryButtonClass}>
              <Icon name="plus" className="h-4 w-4" />
              {w.add}
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

      {isOwner && data && data.totals && workers.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label={`Working with you`} value={active.length} />
          <StatTile label="You owe them" value={formatMoney(data.totals.owed)} tone={data.totals.owed > 0 ? 'red' : undefined} />
          <StatTile label="Paid out so far" value={formatMoney(data.totals.paid)} />
        </div>
      )}

      {editing && <WorkerForm kind={kind} words={w} worker={editing === 'new' ? null : editing} onDone={done} onCancel={() => setEditing(null)} />}

      {!data ? (
        <LoadingState />
      ) : shown.length === 0 ? (
        <EmptyState icon={w.icon} message={w.empty} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((x) => (
            <li key={x._id} className={`${cardClass} p-5 ${x.isActive === false ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{x.name}</p>
                  <p className="text-xs text-gray-500">
                    {[x.role, x.phone ? describePhone(x.phone).display : ''].filter(Boolean).join(' · ') || w.one}
                    {x.isActive === false ? ' · no longer working here' : ''}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex shrink-0 gap-3 text-xs">
                    <button type="button" onClick={() => { setEditing(x); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="font-medium text-gray-600 hover:underline">
                      Edit
                    </button>
                  </div>
                )}
              </div>
              {isOwner && x.summary && (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-gray-50 px-2 py-2">
                      <p className="text-gray-400">Earned</p>
                      <p className="tabular font-semibold text-gray-900">{formatMoney(x.summary.earned + x.summary.bonus)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-2 py-2">
                      <p className="text-gray-400">Paid</p>
                      <p className="tabular font-semibold text-gray-900">{formatMoney(x.summary.paid)}</p>
                    </div>
                    <div className={`rounded-lg px-2 py-2 ${x.summary.balance > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <p className="text-gray-400">{x.summary.balance < 0 ? 'Advance' : 'You owe'}</p>
                      <p className={`tabular font-semibold ${x.summary.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatMoney(Math.abs(x.summary.balance))}</p>
                    </div>
                  </div>
                  <Link href={`/dashboard/workers/${x._id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Account &amp; payments
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {retired.length > 0 && (
        <button type="button" onClick={() => setShowOld((v) => !v)} className="mt-4 text-sm font-medium text-gray-500 hover:underline">
          {showOld ? 'Hide' : 'Show'} {retired.length} who no longer work here
        </button>
      )}
    </>
  );
}

function WorkerForm({ kind, words, worker, onDone, onCancel }) {
  const [name, setName] = useState(worker ? worker.name : '');
  const [phone, setPhone] = useState(worker ? worker.phone || '' : '');
  const [role, setRole] = useState(worker ? worker.role || '' : words.roles[0]);
  const [rate, setRate] = useState(worker && worker.rate > 0 ? String(worker.rate) : '');
  const [guarantor, setGuarantor] = useState(worker ? worker.guarantor || '' : '');
  const [address, setAddress] = useState(worker ? worker.address || '' : '');
  const [notes, setNotes] = useState(worker ? worker.notes || '' : '');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [asking, setAsking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    if (!name.trim()) return setProblem('Enter their name');
    const payload = { name, phone, role, rate: Number(rate) || 0, guarantor, address, notes };
    setBusy(true);
    try {
      if (worker) await updateWorker(worker._id, payload);
      else await createWorker({ ...payload, kind });
      onDone(worker ? 'Details saved' : `${words.one[0].toUpperCase()}${words.one.slice(1)} added`);
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
    }
  }

  async function setActive(active) {
    setBusy(true);
    try {
      await updateWorker(worker._id, { isActive: active });
      onDone(active ? 'Back on the list' : 'Moved to the list of people who no longer work here');
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${cardClass} mb-6 space-y-4 p-5`}>
      <h2 className="text-lg font-medium text-gray-900">{worker ? `Change ${worker.name}` : words.add}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input type="text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Phone number (optional)">
          <input type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="What they do">
          <input type="text" list="worker-roles" maxLength={40} value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
          <datalist id="worker-roles">
            {words.roles.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label={words.rateLabel} hint={words.rateHint}>
          <input type="number" min="0" step="any" value={rate} onChange={(e) => setRate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Guarantor (optional)" hint="Someone who vouches for them: name and phone.">
          <input type="text" maxLength={120} value={guarantor} onChange={(e) => setGuarantor(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Home address (optional)">
          <input type="text" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>
      {problem && <p className="text-sm text-red-600">{problem}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
        {worker && (
          <span className="ml-auto text-sm">
            {worker.isActive === false ? (
              <button type="button" disabled={busy} onClick={() => setActive(true)} className="font-medium text-primary hover:underline">
                They work here again
              </button>
            ) : asking ? (
              <span className="flex items-center gap-2">
                <span className="text-gray-600">Stop giving them work?</span>
                <button type="button" disabled={busy} onClick={() => setActive(false)} className="font-medium text-red-600 hover:underline">
                  Yes
                </button>
                <button type="button" onClick={() => setAsking(false)} className="text-gray-500 hover:underline">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setAsking(true)} className="font-medium text-red-600 hover:underline">
                They no longer work here
              </button>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
