'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { addWorkerEntry, deleteWorkerEntry, getWorker } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { newClientId } from '@/lib/outbox';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { Detail, DetailCard, DetailGrid, MoneyStrip } from '@/components/DetailParts';
import { SectionCard } from '@/components/JobParts';
import { ErrorBanner, Field, LoadingState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

const ENTRY_LABEL = { earning: 'Earned', bonus: 'Bonus', deduction: 'Taken off', payout: 'Paid out' };
const ENTRY_SIGN = { earning: 1, bonus: 1, deduction: -1, payout: -1 };

// One worker's account (administrator only): what they earned, what you paid them, and what you still owe.
// This page only keeps the record. No money is sent from here: you pay them yourself, then write it down.
export default function WorkerAccountPage() {
  const { id } = useParams();
  const { isOwner } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    getWorker(id)
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  if (!isOwner) {
    return (
      <>
        <PageHeader title="Worker account" />
        <ErrorBanner message="Only the administrator can see what workers earn." />
      </>
    );
  }
  if (loading) return <LoadingState />;
  if (!data) {
    return (
      <>
        <PageHeader title="Worker not found" backHref="/dashboard" backLabel="Back" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const { worker, entries, work } = data;
  const s = worker.summary;
  const backHref = '/dashboard/tailor/workers';

  function saved(next, message) {
    setData((d) => ({ ...d, worker: { ...d.worker, summary: next } }));
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={worker.name}
        subtitle={[worker.role, worker.phone ? describePhone(worker.phone).display : ''].filter(Boolean).join(' · ') || 'Tailor'}
        backHref={backHref}
        backLabel="Back to tailors"
      />
      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      <DetailCard title="Account" icon="wallet">
        <MoneyStrip
          items={[
            { label: 'Earned', value: formatMoney(s.earned + s.bonus), tone: 'plain' },
            { label: 'Paid out', value: formatMoney(s.paid), tone: 'good' },
            s.balance > 0 ? { label: 'You owe', value: formatMoney(s.balance), tone: 'bad' } : s.balance < 0 ? { label: 'Advance given', value: formatMoney(-s.balance), tone: 'warn', note: 'paid before it was earned' } : { label: 'You owe', value: formatMoney(0), tone: 'good', note: 'Nothing owed' },
          ]}
        />
        <DetailGrid>
          <Detail label="Garments given" icon="scissors" color="teal">{work.assigned}</Detail>
          <Detail label="Garments finished" icon="check" color="green">{work.finished}</Detail>
          <Detail label="Still sewing" icon="clock" color="amber">{work.open}</Detail>
          <Detail label="Usual pay per garment" icon="naira" color="green">{worker.rate > 0 ? formatMoney(worker.rate) : ''}</Detail>
          <Detail label="Guarantor" icon="shield" color="sky">{worker.guarantor}</Detail>
          <Detail label="Home address" icon="pin" color="rose" wide>{worker.address}</Detail>
          {worker.notes && <Detail label="Notes" icon="note" color="amber" wide>{worker.notes}</Detail>}
        </DetailGrid>
      </DetailCard>

      <SectionCard title="Record a payment or adjustment">
        <EntryForm id={worker._id} name={worker.name} balance={s.balance} onSaved={saved} />
        <p className="mt-4 text-xs text-gray-400">This keeps the record only. LogBase does not send money: pay {worker.name.split(' ')[0]} in cash or by transfer yourself, then write it down here.</p>
      </SectionCard>

      <SectionCard title="Account history">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing yet. What a tailor earns appears here when a garment is finished.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {entries.map((e) => (
              <HistoryRow key={e._id} entry={e} workerId={worker._id} onRemoved={(next) => saved(next, 'Entry removed')} onError={setError} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function HistoryRow({ entry: e, workerId, onRemoved, onError }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const sign = ENTRY_SIGN[e.kind];
  const removable = e.kind !== 'earning';
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <span className="min-w-0">
        <span className="font-medium text-gray-900">{ENTRY_LABEL[e.kind]}</span>
        {e.method && e.kind === 'payout' && <span className="ml-2 text-gray-500">{e.method === 'transfer' ? 'Transfer' : e.method === 'cash' ? 'Cash' : 'Other'}</span>}
        <span className="block text-xs text-gray-400">
          {formatDateTime(e.at)}
          {e.sourceCode ? ` · ${e.sourceCode}` : ''}
          {e.description ? ` · ${e.description}` : ''}
          {e.recordedByName && e.kind !== 'earning' ? ` · ${e.recordedByName}` : ''}
        </span>
        {removable && (
          <span className="mt-1 block text-xs">
            {asking ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-gray-600">Remove this entry?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await deleteWorkerEntry(workerId, e._id);
                      const fresh = await getWorker(workerId);
                      onRemoved(fresh.worker.summary);
                    } catch (err) {
                      onError(err.message);
                      setBusy(false);
                      setAsking(false);
                    }
                  }}
                  className="font-medium text-red-600 hover:underline"
                >
                  Yes
                </button>
                <button type="button" onClick={() => setAsking(false)} className="text-gray-500 hover:underline">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setAsking(true)} className="text-red-600 hover:underline">
                Remove (written by mistake)
              </button>
            )}
          </span>
        )}
      </span>
      <span className={`tabular shrink-0 font-medium ${sign > 0 ? 'text-green-700' : 'text-gray-900'}`}>
        {sign > 0 ? '+' : '−'}
        {formatMoney(e.amount)}
      </span>
    </li>
  );
}

const KINDS = [
  { value: 'payout', label: 'Pay them' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'deduction', label: 'Take off' },
];

function EntryForm({ id, name, balance, onSaved }) {
  const [kind, setKind] = useState('payout');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [advance, setAdvance] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  // this entry's own id, kept until it is saved, so a double tap or a lost answer never writes it twice
  const key = useRef(null);

  const value = Number(amount) || 0;
  const isAdvance = kind === 'payout' && value > Math.max(balance, 0);

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    if (!(value > 0)) return setProblem('Enter an amount');
    if (isAdvance && !advance) return setProblem(balance > 0 ? `${name} is owed ${formatMoney(balance)}. Tick the box to confirm that the extra is an advance.` : `${name} is not owed anything. Tick the box to confirm that this is an advance.`);
    if (!key.current) key.current = newClientId();
    setBusy(true);
    try {
      const payload = { kind, amount: value, description: description.trim() || undefined, key: key.current };
      if (kind === 'payout') {
        payload.method = method;
        if (isAdvance) payload.advance = true;
      }
      const res = await addWorkerEntry(id, payload);
      key.current = null;
      setAmount('');
      setDescription('');
      setAdvance(false);
      onSaved(res.summary, res.duplicate ? 'That was already written down' : kind === 'payout' ? 'Payment written down' : kind === 'bonus' ? 'Bonus added' : 'Deduction recorded');
    } catch (err) {
      setProblem(err.offline ? 'There is no connection, so we could not confirm that this was saved. Look at the history before you try again. Pressing Save again is safe.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="What to record">
        {KINDS.map((k) => (
          <button key={k.value} type="button" onClick={() => setKind(k.value)} aria-pressed={kind === k.value} className={`rounded-lg px-3 py-1.5 text-sm transition ${kind === k.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {k.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount (₦)">
          <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder={kind === 'payout' && balance > 0 ? String(balance) : ''} />
        </Field>
        {kind === 'payout' && (
          <Field label="Paid by">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="other">Other</option>
            </select>
          </Field>
        )}
      </div>
      <Field label="Note (optional)" hint={kind === 'deduction' ? 'Say why, e.g. cloth damaged.' : kind === 'bonus' ? 'Say why, e.g. finished the wedding order early.' : undefined}>
        <input type="text" maxLength={160} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
      </Field>
      {isAdvance && (
        <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)} className="mt-0.5" />
          <span>
            {balance > 0 ? `This is more than the ${formatMoney(balance)} owed.` : `${name} is not owed anything.`} This payment is an advance: it will be taken off what they earn next.
          </span>
        </label>
      )}
      {problem && <p className="text-sm text-red-600">{problem}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : kind === 'payout' ? 'Write down payment' : kind === 'bonus' ? 'Add bonus' : 'Record deduction'}
        </button>
        {kind === 'payout' && balance > 0 && (
          <button type="button" onClick={() => setAmount(String(balance))} className={secondaryButtonClass}>
            Fill all they are owed ({formatMoney(balance)})
          </button>
        )}
      </div>
    </form>
  );
}
