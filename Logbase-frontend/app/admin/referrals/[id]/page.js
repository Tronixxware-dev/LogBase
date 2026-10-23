'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, ErrorBanner, Field, LoadingState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { adminPayReferrer, adminReferrer, adminUpdateReferrer } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { Panel, StatCard, useLoad } from '@/components/admin/ui';
import CopyButton from '@/components/admin/CopyButton';
import { signupLink } from '@/lib/referrals';

const link = signupLink;

export default function AdminReferrerPage() {
  const { id } = useParams();
  const { data, setData, error, loading } = useLoad(() => adminReferrer(id), [id]);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  // runs one change and shows the referrer as it is afterwards
  async function run(label, task) {
    setProblem('');
    setBusy(true);
    try {
      setData(await task());
      notifySuccess(label);
      return true;
    } catch (err) {
      setProblem(err.message || 'That did not work');
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Referrer" backHref="/admin/referrals" backLabel="All referrals" />
        <LoadingState />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Referrer" backHref="/admin/referrals" backLabel="All referrals" />
        <ErrorBanner message={error || 'Referrer not found'} />
      </>
    );
  }

  const { referrer, referred, commissions, payouts } = data;

  function startEdit() {
    setForm({ name: referrer.name, phone: referrer.phone, email: referrer.email, ratePercent: String(referrer.ratePercent), notes: referrer.notes });
    setEditing(true);
  }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const referredColumns = [
    { key: 'name', label: 'Business', render: (b) => <span className="font-medium text-gray-900">{b.name}</span> },
    { key: 'signedUpAt', label: 'Signed up', render: (b) => formatDate(b.signedUpAt) },
    { key: 'plan', label: 'Plan now', render: (b) => <Badge tone={b.plan === 'Free trial' || b.plan === 'Expired' ? 'gray' : 'green'}>{b.plan}</Badge> },
    { key: 'earned', label: 'Earned from it', align: 'right', render: (b) => formatMoney(b.earned) },
  ];
  const commissionColumns = [
    { key: 'earnedAt', label: 'Date', render: (c) => formatDateTime(c.earnedAt) },
    { key: 'businessName', label: 'Business' },
    { key: 'plan', label: 'Plan', render: (c) => `${c.plan || '—'}${c.interval ? ` (${c.interval})` : ''}` },
    { key: 'paymentAmount', label: 'They paid', align: 'right', render: (c) => formatMoney(c.paymentAmount) },
    { key: 'ratePercent', label: 'Share', align: 'right', render: (c) => `${c.ratePercent}%` },
    { key: 'amount', label: 'Earned', align: 'right', render: (c) => <span className="font-medium">{formatMoney(c.amount)}</span> },
    { key: 'status', label: 'Status', render: (c) => <Badge tone={c.status === 'paid' ? 'green' : 'amber'}>{c.status === 'paid' ? `Paid ${c.paidAt ? formatDate(c.paidAt) : ''}` : 'Owed'}</Badge> },
  ];
  const payoutColumns = [
    { key: 'createdAt', label: 'Date', render: (p) => formatDateTime(p.createdAt) },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => <span className="font-medium">{formatMoney(p.amount)}</span> },
    { key: 'commissions', label: 'Payments covered', align: 'right' },
    { key: 'note', label: 'Note' },
    { key: 'paidByEmail', label: 'Recorded by' },
  ];

  return (
    <>
      <PageHeader
        title={referrer.name}
        subtitle={[referrer.phone, referrer.email, `${referrer.ratePercent}% of each payment`, `since ${formatDate(referrer.createdAt)}`].filter(Boolean).join(' · ')}
        backHref="/admin/referrals"
        backLabel="All referrals"
        action={<Badge tone={referrer.isActive ? 'green' : 'gray'}>{referrer.isActive ? 'Active' : 'Switched off'}</Badge>}
      />

      <ErrorBanner message={problem} />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Referral code</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-gray-900">{referrer.code}</p>
        <p className="mt-2 break-all text-sm text-gray-500">{link(referrer.code)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={referrer.code}>Copy code</CopyButton>
          <CopyButton text={link(referrer.code)}>Copy sign-up link</CopyButton>
          <button type="button" onClick={startEdit} className={secondaryButtonClass}>
            Edit details
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(referrer.isActive ? 'Code switched off' : 'Code switched on', () => adminUpdateReferrer(id, { isActive: !referrer.isActive }))}
            className={secondaryButtonClass}
          >
            {referrer.isActive ? 'Switch off' : 'Switch on'}
          </button>
        </div>
        {!referrer.isActive && <p className="mt-3 text-xs text-gray-500">A switched-off code cannot be used by new sign-ups. Businesses it already referred keep earning for this referrer.</p>}
      </div>

      {editing && form && (
        <Panel title="Edit details" className="mb-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const done = await run('Details saved', () => adminUpdateReferrer(id, { ...form, ratePercent: Number(form.ratePercent) }));
              if (done) setEditing(false);
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Name">
              <input value={form.name} onChange={set('name')} required maxLength={80} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')} maxLength={30} className={inputClass} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set('email')} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Share of each payment (%)" hint="Only applies to payments made from now on. What was already earned keeps its old share.">
              <input type="number" min="1" max="100" value={form.ratePercent} onChange={set('ratePercent')} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Note">
                <input value={form.notes} onChange={set('notes')} maxLength={300} className={inputClass} />
              </Field>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={busy} className={primaryButtonClass}>
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className={secondaryButtonClass}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Referred" value={referrer.referred} sub="businesses signed up" />
        <StatCard label="Paying" value={referrer.paying} sub="have paid for a plan" />
        <StatCard label="Earned" value={formatMoney(referrer.earned)} sub={`from ${referrer.payments} payment${referrer.payments === 1 ? '' : 's'}`} />
        <StatCard label="Owed now" value={formatMoney(referrer.owed)} tone={referrer.owed > 0 ? 'amber' : 'gray'} />
        <StatCard label="Paid out" value={formatMoney(referrer.paid)} tone="green" />
      </div>

      {referrer.owed > 0 && (
        <Panel title={`Pay ${referrer.name}`} className="mb-6">
          {!paying ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                {formatMoney(referrer.owed)} is owed. Send it to them first (transfer or cash), then record it here so it is not owed any more.
              </p>
              <button type="button" onClick={() => setPaying(true)} className={primaryButtonClass}>
                Record a payout
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Record that you paid <span className="font-semibold">{formatMoney(referrer.owed)}</span> to {referrer.name}? Every commission owed now will be marked paid.
              </p>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputClass} placeholder="Note (optional), e.g. Bank transfer, 22 Oct" />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const done = await run('Payout recorded', () => adminPayReferrer(id, note));
                    if (done) {
                      setPaying(false);
                      setNote('');
                    }
                  }}
                  className={primaryButtonClass}
                >
                  {busy ? 'Saving…' : `Yes, ${formatMoney(referrer.owed)} was paid`}
                </button>
                <button type="button" onClick={() => setPaying(false)} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}

      <Panel title="Businesses referred" className="mb-6">
        {referred.length === 0 ? (
          <p className="text-sm text-gray-500">Nobody has signed up with this code yet.</p>
        ) : (
          <DataTable columns={referredColumns} rows={referred} numbered={false} />
        )}
      </Panel>

      <Panel title="Earnings" className="mb-6">
        {commissions.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing earned yet. A commission appears each time a referred business pays for a plan.</p>
        ) : (
          <DataTable columns={commissionColumns} rows={commissions} numbered={false} />
        )}
      </Panel>

      <Panel title="Payouts">
        {payouts.length === 0 ? <p className="text-sm text-gray-500">No payouts recorded yet.</p> : <DataTable columns={payoutColumns} rows={payouts} numbered={false} />}
      </Panel>
    </>
  );
}
