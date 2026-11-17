'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, ErrorBanner, Field, LoadingState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { adminAdjustAgent, adminAgent, adminPayAgent, adminUpdateAgent } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { Panel, StatCard, useLoad } from '@/components/admin/ui';
import CopyButton from '@/components/admin/CopyButton';
import PersonPicker from '@/components/admin/PersonPicker';
import { signupLink } from '@/lib/referrals';

const TYPE_LABEL = { new_shop: 'New Shop Bonus', renewal: 'Renewal Commission', weekly: 'Weekly Activity Bonus', milestone: 'Monthly Milestone', adjustment: 'Correction' };
const RANKS = [
  { value: 'agent', label: 'Sales Agent (10% of renewals)' },
  { value: 'senior', label: 'Senior Sales Agent (12%)' },
  { value: 'lead', label: 'Team Lead (15%)' },
];

function shopStatus(s) {
  if (s.state === 'activated') return <Badge tone={s.paying ? 'green' : 'amber'}>{s.paying ? 'Activated and paying' : 'Activated · plan ended'}</Badge>;
  if (s.state === 'activating') return <Badge tone="amber">{`Getting started: ${s.progress.products}/5 products, ${s.progress.sales}/2 sales · ${s.progress.daysLeft}d left`}</Badge>;
  if (s.state === 'missed') return <Badge tone="gray">Did not get going in time</Badge>;
  return <Badge tone="gray">Not paid yet</Badge>;
}

export default function AdminAgentPage() {
  const { id } = useParams();
  const { data, setData, error, loading } = useLoad(() => adminAgent(id), [id]);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [adjust, setAdjust] = useState({ amount: '', note: '' });
  const [adjusting, setAdjusting] = useState(false);

  // runs one change and shows the agent as it is afterwards
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
        <PageHeader title="Sales Agent" backHref="/admin/agents" backLabel="All Sales Agents" />
        <LoadingState />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Sales Agent" backHref="/admin/agents" backLabel="All Sales Agents" />
        <ErrorBanner message={error || 'Sales Agent not found'} />
      </>
    );
  }

  const { profile, totals, week, month, shops, earnings, payouts, logs } = data;
  const link = signupLink(profile.code);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function startEdit() {
    setForm({ name: profile.name, phone: profile.phone, email: profile.email, rank: profile.rank, notes: profile.notes });
    setEditing(true);
  }

  const shopColumns = [
    { key: 'name', label: 'Business', render: (s) => <span className="font-medium text-gray-900">{s.name}</span> },
    { key: 'signedUpAt', label: 'Signed up', render: (s) => formatDate(s.signedUpAt) },
    { key: 'state', label: 'Where it is', render: shopStatus },
    { key: 'earned', label: 'Earned from it', align: 'right', render: (s) => formatMoney(s.earned) },
  ];
  const earningColumns = [
    { key: 'earnedAt', label: 'Date', render: (e) => formatDateTime(e.earnedAt) },
    {
      key: 'type',
      label: 'What for',
      render: (e) => (
        <span>
          <span className="font-medium text-gray-900">{TYPE_LABEL[e.type] || e.type}</span>
          <span className="block text-xs text-gray-500">
            {e.businessName || e.note || ''}
            {e.type === 'renewal' && e.ratePercent ? ` · ${e.ratePercent}% of ${formatMoney(e.paymentAmount)}` : ''}
          </span>
        </span>
      ),
    },
    { key: 'amount', label: 'Amount', align: 'right', render: (e) => <span className={`font-medium ${e.amount < 0 ? 'text-red-700' : ''}`}>{formatMoney(e.amount)}</span> },
    { key: 'status', label: 'Status', render: (e) => <Badge tone={e.status === 'paid' ? 'green' : 'amber'}>{e.status === 'paid' ? `Paid ${e.paidAt ? formatDate(e.paidAt) : ''}` : e.onHold ? `On hold until ${formatDate(e.payableOn)}` : 'Owed'}</Badge> },
  ];
  const payoutColumns = [
    { key: 'createdAt', label: 'Date', render: (p) => formatDateTime(p.createdAt) },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => <span className="font-medium">{formatMoney(p.amount)}</span> },
    { key: 'note', label: 'Note' },
    { key: 'paidByEmail', label: 'Recorded by' },
  ];
  const logColumns = [
    { key: 'day', label: 'Day', render: (l) => formatDate(l.day) },
    { key: 'visits', label: 'Visits', align: 'right' },
    { key: 'demos', label: 'Demos', align: 'right' },
    { key: 'notes', label: 'Note' },
  ];

  return (
    <>
      <PageHeader
        title={profile.name}
        subtitle={[profile.agentNo, profile.rankName, profile.phone, profile.email, `since ${formatDate(profile.startedAt)}`].filter(Boolean).join(' · ')}
        backHref="/admin/agents"
        backLabel="All Sales Agents"
        action={<Badge tone={profile.isActive ? 'green' : 'gray'}>{profile.isActive ? 'Active' : 'Switched off'}</Badge>}
      />

      <ErrorBanner message={problem} />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Referral code · ID {profile.agentNo}</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-gray-900">{profile.code}</p>
        <p className="mt-2 break-all text-sm text-gray-500">{link}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={profile.code}>Copy code</CopyButton>
          <CopyButton text={link}>Copy sign-up link</CopyButton>
          <button type="button" onClick={startEdit} className={secondaryButtonClass}>
            Edit details or rank
          </button>
          <button type="button" disabled={busy} onClick={() => run(profile.isActive ? 'Sales Agent switched off' : 'Sales Agent switched on', () => adminUpdateAgent(id, { isActive: !profile.isActive }))} className={secondaryButtonClass}>
            {profile.isActive ? 'Switch off' : 'Switch on'}
          </button>
        </div>
        {!profile.isActive && <p className="mt-3 text-xs text-gray-500">A switched-off agent earns nothing new, and their code cannot be used by new sign-ups. What was earned before stays owed to them. Switching them back on starts earning again from that moment.</p>}
      </div>

      {editing && form && (
        <Panel title="Edit details" className="mb-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const done = await run('Details saved', () => adminUpdateAgent(id, form));
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
            <Field label="Rank" hint="A new rank only applies to renewal payments from now on. What was already earned keeps its old share.">
              <select value={form.rank} onChange={set('rank')} className={inputClass}>
                {RANKS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
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

      <Panel title="Their LogBase account" className="mb-6">
        {profile.account ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              Linked to <span className="font-semibold text-gray-900">{profile.account.name}</span> ({profile.account.email}). They see their dashboard under <span className="font-medium">Sales agent</span> in their own LogBase menu.
            </p>
            <button type="button" disabled={busy} onClick={() => run('Account unlinked', () => adminUpdateAgent(id, { userId: null }))} className={secondaryButtonClass}>
              Unlink account
            </button>
          </div>
        ) : (
          <PersonPicker
            picked={null}
            label="Link a LogBase account"
            hint="The agent signs up on mylogbase.com like anyone else, then you pick that account here. A Sales agent item then appears in their menu. Until then only you see these numbers."
            onPick={(p) => run('Account linked', () => adminUpdateAgent(id, { userId: p._id }))}
            onClear={() => {}}
          />
        )}
      </Panel>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Registered" value={totals.shops} sub="businesses signed up" />
        <StatCard label="Activated" value={totals.activated} sub={`${totals.payingNow} paying now`} />
        <StatCard label="Earned" value={formatMoney(totals.earned)} sub="all time" />
        <StatCard label="Owed" value={formatMoney(totals.owed)} sub={totals.held > 0 ? `${formatMoney(totals.payable)} payable now, ${formatMoney(totals.held)} on hold` : undefined} tone={totals.owed > 0 ? 'amber' : 'gray'} />
        <StatCard label="Paid out" value={formatMoney(totals.paid)} tone="green" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title="This week">
          <p className="text-sm text-gray-700">
            {week.visits}/{week.targets.visits} visits · {week.demos}/{week.targets.demos} demos · {week.registrations}/{week.targets.registrations} registered
          </p>
          <p className="mt-1 text-xs text-gray-500">{week.credited ? 'Weekly bonus already credited.' : week.qualifies ? 'Reached all three targets.' : 'Targets not reached yet.'} Credit finished weeks from the weekly bonus check.</p>
        </Panel>
        <Panel title="This month">
          <p className="text-sm text-gray-700">
            {month.activated} new activated shop{month.activated === 1 ? '' : 's'} so far
            {month.next ? ` · ${month.next.toGo} to the ${formatMoney(month.next.amount)} milestone` : ' · top milestone reached'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Milestones are credited on their own once the month has ended.</p>
        </Panel>
      </div>

      {totals.owed > 0 && (
        <Panel title={`Pay ${profile.name}`} className="mb-6">
          {!paying ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                {totals.payable > 0 ? (
                  <>
                    {formatMoney(totals.payable)} can be paid now. Send it to their bank account first, then record it here so it is not owed any more.
                  </>
                ) : (
                  <>Nothing can be paid yet.</>
                )}
                {totals.held > 0 && (
                  <span className="mt-1 block text-xs text-gray-500">
                    {formatMoney(totals.held)} of New Shop Bonuses is held for 30 days (a shop that is refunded in that time loses its bonus){totals.nextPayableOn ? `. The first is payable on ${formatDate(totals.nextPayableOn)}` : ''}.
                  </span>
                )}
              </p>
              {totals.payable > 0 && (
                <button type="button" onClick={() => setPaying(true)} className={primaryButtonClass}>
                  Record a payout
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Record that you paid <span className="font-semibold">{formatMoney(totals.payable)}</span> to {profile.name}? Every line that is payable now will be marked paid; bonuses on hold stay owed.
              </p>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputClass} placeholder="Note (optional), e.g. Bank transfer, Friday payout" />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const done = await run('Payout recorded', () => adminPayAgent(id, note));
                    if (done) {
                      setPaying(false);
                      setNote('');
                    }
                  }}
                  className={primaryButtonClass}
                >
                  {busy ? 'Saving…' : `Yes, ${formatMoney(totals.payable)} was paid`}
                </button>
                <button type="button" onClick={() => setPaying(false)} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}

      <Panel title="Shops registered" className="mb-6">
        {shops.length === 0 ? <p className="text-sm text-gray-500">Nobody has signed up with this code yet.</p> : <DataTable columns={shopColumns} rows={shops} numbered={false} />}
      </Panel>

      <Panel title="Earnings" className="mb-6">
        {earnings.length === 0 ? <p className="text-sm text-gray-500">Nothing earned yet.</p> : <DataTable columns={earningColumns} rows={earnings} numbered={false} />}
        <div className="mt-4 border-t border-gray-100 pt-4">
          {!adjusting ? (
            <button type="button" onClick={() => setAdjusting(true)} className={secondaryButtonClass}>
              Add a correction
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const done = await run('Correction added', () => adminAdjustAgent(id, { amount: Number(adjust.amount), note: adjust.note }));
                if (done) {
                  setAdjust({ amount: '', note: '' });
                  setAdjusting(false);
                }
              }}
              className="grid gap-3 sm:grid-cols-3"
            >
              <Field label="Amount (naira)" hint="Use a minus sign to take money back, e.g. -1000 for a refunded shop's bonus.">
                <input type="number" step="1" value={adjust.amount} onChange={(e) => setAdjust((a) => ({ ...a, amount: e.target.value }))} required className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Reason">
                  <input value={adjust.note} onChange={(e) => setAdjust((a) => ({ ...a, note: e.target.value }))} required maxLength={200} className={inputClass} placeholder="e.g. Ola Phones refunded within 30 days" />
                </Field>
              </div>
              <div className="flex gap-2 sm:col-span-3">
                <button type="submit" disabled={busy} className={primaryButtonClass}>
                  Add the correction
                </button>
                <button type="button" onClick={() => setAdjusting(false)} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </Panel>

      <Panel title="Their last 14 written-up days" className="mb-6">
        {logs.length === 0 ? <p className="text-sm text-gray-500">They have not written up any day yet.</p> : <DataTable columns={logColumns} rows={logs} numbered={false} />}
      </Panel>

      <Panel title="Payouts">
        {payouts.length === 0 ? <p className="text-sm text-gray-500">No payouts recorded yet.</p> : <DataTable columns={payoutColumns} rows={payouts} numbered={false} />}
      </Panel>
    </>
  );
}
