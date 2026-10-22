'use client';

import { useRef, useState } from 'react';
import { newClientId } from '@/lib/outbox';
import { formatDateTime, formatMoney } from '@/lib/format';
import { PAYMENT_METHODS, methodLabel, statusInfo } from '@/lib/jobs';
import { Badge, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';
import { useUser } from '@/components/UserProvider';

// Small pieces shared by the repair jobs and the laundry register.

export function JobStatusBadge({ statuses, value }) {
  const info = statusInfo(statuses, value);
  return <Badge tone={info.tone}>{info.label}</Badge>;
}

// Row of buttons to move a job along. The current status is highlighted; "collected" is final.
export function StatusButtons({ statuses, current, onChange, busy, disabled }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Change status">
      {statuses.map((s) => {
        const isCurrent = s.value === current;
        return (
          <button
            key={s.value}
            type="button"
            disabled={busy || disabled || isCurrent}
            aria-pressed={isCurrent}
            onClick={() => onChange(s.value)}
            className={`rounded-lg border px-3 py-2 text-sm transition disabled:cursor-default ${
              isCurrent
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// A filter row: All / each status, with how many there are
export function StatusFilter({ options, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap rounded-xl bg-gray-100 p-1" role="group" aria-label="Status">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
            value === o.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs text-gray-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ label, value, tone }) {
  return (
    <div className={`${cardClass} px-4 py-3`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`tabular mt-0.5 text-xl font-semibold ${tone === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export function PaymentMethodSelect({ value, onChange, id }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {PAYMENT_METHODS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );
}

// "Take a payment". onSubmit({ amount, method, note }) returns a promise; the form clears when it works.
export function PaymentForm({ balance, onSubmit, busy }) {
  const { settings } = useUser();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(settings.preferences.defaultPaymentMethod);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  // this payment's own id: kept until it is recorded, so a double tap or a lost answer never takes the money twice
  const paymentKey = useRef(null);

  async function handle(e) {
    e.preventDefault();
    setProblem('');
    const value = Number(amount);
    if (!(value > 0)) {
      setProblem('Enter the amount the customer is paying');
      return;
    }
    if (balance > 0 && value > balance) {
      setProblem(`That is more than the balance of ${formatMoney(balance)}`);
      return;
    }
    if (!paymentKey.current) paymentKey.current = newClientId();
    const ok = await onSubmit({ amount: value, method, note: note.trim() || undefined, paymentKey: paymentKey.current });
    if (ok) {
      paymentKey.current = null;
      setAmount('');
      setNote('');
    }
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Amount (₦)">
          <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder={balance > 0 ? String(balance) : ''} />
        </Field>
        <Field label="Paid by">
          <PaymentMethodSelect value={method} onChange={setMethod} />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input type="text" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </Field>
      {problem && <p className="text-sm text-red-600">{problem}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : 'Record payment'}
        </button>
        {balance > 0 && (
          <button
            type="button"
            onClick={() => setAmount(String(balance))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Fill the full balance ({formatMoney(balance)})
          </button>
        )}
      </div>
    </form>
  );
}

export function PaymentsList({ payments }) {
  if (!payments || payments.length === 0) return <p className="text-sm text-gray-400">No payment yet.</p>;
  return (
    <ul className="divide-y divide-gray-100 text-sm">
      {payments.map((p) => (
        <li key={p._id} className="flex items-start justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="font-medium text-gray-900">{p.kind === 'deposit' ? 'Deposit' : 'Payment'}</span>
            <span className="ml-2 text-gray-500">{methodLabel(p.method)}</span>
            <span className="block text-xs text-gray-400">
              {formatDateTime(p.at)}
              {p.recordedByName ? ` · ${p.recordedByName}` : ''}
              {p.note ? ` · ${p.note}` : ''}
            </span>
          </span>
          <span className="tabular shrink-0 font-medium text-gray-900">{formatMoney(p.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

export function HistoryList({ history, statuses }) {
  if (!history || history.length === 0) return null;
  return (
    <ol className="space-y-2 text-sm">
      {history.map((h, i) => (
        <li key={h._id || i} className="flex items-start gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
          <span className="min-w-0 text-gray-700">
            <span className="font-medium text-gray-900">{statusInfo(statuses, h.status).label}</span>
            <span className="block text-xs text-gray-400">
              {formatDateTime(h.at)}
              {h.byName ? ` · ${h.byName}` : ''}
              {h.note ? ` · ${h.note}` : ''}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// One fact in a details grid (see components/DetailParts.js for the look)
export { Detail } from '@/components/DetailParts';

// A white card with a heading
export function SectionCard({ title, children, action }) {
  return (
    <div className={`${cardClass} mb-6 p-6`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
