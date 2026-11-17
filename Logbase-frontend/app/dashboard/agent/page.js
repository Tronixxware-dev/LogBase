'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, ErrorBanner, Field, LoadingState, inputClass, primaryButtonClass } from '@/components/ui';
import { getMyAgent, saveAgentLog } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { Panel, StatCard, useLoad } from '@/components/admin/ui';
import CopyButton from '@/components/admin/CopyButton';
import { signupLink } from '@/lib/referrals';
import QrImage from '@/components/QrImage';

// A Sales Agent's own page: their code, this week's targets, this month's milestone, every shop they brought and what they earned.
// The pay plan is the one in the Sales Agent Programme Handbook (the server works everything out; see utils/agents.js).

const TYPE_LABEL = {
  new_shop: 'New Shop Bonus',
  renewal: 'Renewal Commission',
  weekly: 'Weekly Activity Bonus',
  milestone: 'Monthly Milestone',
  adjustment: 'Correction',
};

function Bar({ value, target, done }) {
  const pct = Math.max(0, Math.min(100, target ? (value / target) * 100 : 0));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Target({ label, value, target }) {
  const done = value >= target;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`tabular font-semibold ${done ? 'text-emerald-700' : 'text-gray-900'}`}>
          {value} / {target}
        </span>
      </div>
      <Bar value={value} target={target} done={done} />
    </div>
  );
}

// the last 7 days, newest first, from the server's "today" ('YYYY-MM-DD', Lagos time)
function lastDays(today) {
  const base = new Date(`${today}T00:00:00Z`).getTime();
  return Array.from({ length: 7 }, (_, i) => new Date(base - i * 86400000).toISOString().slice(0, 10));
}

function DailyLog({ data, onSaved }) {
  const days = lastDays(data.today);
  const [day, setDay] = useState(data.today);
  const existing = data.logs.find((l) => l.day === day);
  const [visits, setVisits] = useState(existing ? String(existing.visits) : '');
  const [demos, setDemos] = useState(existing ? String(existing.demos) : '');
  const [notes, setNotes] = useState(existing ? existing.notes : '');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  function pick(value) {
    setDay(value);
    const found = data.logs.find((l) => l.day === value);
    setVisits(found ? String(found.visits) : '');
    setDemos(found ? String(found.demos) : '');
    setNotes(found ? found.notes : '');
    setProblem('');
  }

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    setSaving(true);
    try {
      await saveAgentLog({ day, visits: Number(visits || 0), demos: Number(demos || 0), notes });
      notifySuccess('Saved', `Your day for ${formatDate(day)} is written up`);
      onSaved();
    } catch (err) {
      setProblem(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
      <Field label="Day">
        <select value={day} onChange={(e) => pick(e.target.value)} className={inputClass}>
          {days.map((d) => (
            <option key={d} value={d}>
              {d === data.today ? 'Today' : formatDate(d)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Shops visited">
        <input type="number" min="0" max="500" inputMode="numeric" value={visits} onChange={(e) => setVisits(e.target.value)} className={inputClass} placeholder="0" />
      </Field>
      <Field label="Demos given">
        <input type="number" min="0" max="500" inputMode="numeric" value={demos} onChange={(e) => setDemos(e.target.value)} className={inputClass} placeholder="0" />
      </Field>
      <div className="flex items-end">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full`}>
          {saving ? 'Saving…' : 'Save my day'}
        </button>
      </div>
      <div className="sm:col-span-4">
        <Field label="Note (optional)" hint="Who was interested, who to follow up. Only you and the Programme Desk see this.">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-4">
        <ErrorBanner message={problem} />
      </div>
    </form>
  );
}

function shopStatus(s, rules) {
  if (s.state === 'activated') return <Badge tone={s.paying ? 'green' : 'amber'}>{s.paying ? 'Activated and paying' : 'Activated · plan ended'}</Badge>;
  if (s.state === 'activating') return <Badge tone="amber">{`Getting started: ${s.progress.products}/${rules.products} products, ${s.progress.sales}/${rules.sales} sales · ${s.progress.daysLeft} day${s.progress.daysLeft === 1 ? '' : 's'} left`}</Badge>;
  if (s.state === 'missed') return <Badge tone="gray">Did not get going in time</Badge>;
  if (s.trial) return <Badge tone={s.trial.ended ? 'red' : s.trial.daysLeft <= 3 ? 'amber' : 'gray'}>{s.trial.ended ? 'Free trial ended, not paid' : `Free trial: ${s.trial.daysLeft} day${s.trial.daysLeft === 1 ? '' : 's'} left`}</Badge>;
  return <Badge tone="gray">Not paid yet</Badge>;
}

export default function SalesAgentPage() {
  const { data, error, loading, reload } = useLoad(() => getMyAgent(), []);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Sales agent" />
        <LoadingState />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Sales agent" />
        <ErrorBanner message={error || 'Could not load your page'} />
      </>
    );
  }
  if (!data.agent) {
    return (
      <>
        <PageHeader title="Sales agent" />
        <p className="text-sm text-gray-500">There is no Sales Agent record linked to your account.</p>
      </>
    );
  }

  const { agent, totals, week, month, rankProgress, shops, earnings, payouts, logs, leaderboard, rules, desk } = data;
  const link = signupLink(agent.code);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Stop keeping your sales and stock in a notebook. Start free on LogBase: ${link}`)}`;
  const last = week.last;
  // shops that signed up but have not paid: the ones whose trial is about to end (or just ended) come first
  const followUp = shops
    .filter((s) => s.state === 'not_paid' && s.trial)
    .sort((a, b) => a.trial.daysLeft - b.trial.daysLeft)
    .slice(0, 30);
  const followUpColumns = [
    { key: 'name', label: 'Business', render: (s) => <span className="font-medium text-gray-900">{s.name}</span> },
    { key: 'trial', label: 'Free trial', render: (s) => <Badge tone={s.trial.ended ? 'red' : s.trial.daysLeft <= 3 ? 'amber' : 'gray'}>{s.trial.ended ? `Ended ${Math.abs(s.trial.daysLeft)} day${Math.abs(s.trial.daysLeft) === 1 ? '' : 's'} ago` : `Ends in ${s.trial.daysLeft} day${s.trial.daysLeft === 1 ? '' : 's'}`}</Badge> },
    {
      key: 'phone',
      label: 'Call',
      render: (s) =>
        s.phone ? (
          <span className="flex flex-wrap gap-2 text-sm">
            <a href={`tel:${s.phone}`} className="font-medium text-teal-700 underline">
              {s.phone}
            </a>
            <a
              href={`https://wa.me/${String(s.phone).replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hello ${s.name}, your free LogBase trial is ending soon. Subscribe on mylogbase.com to keep your sales and stock safe.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 underline"
            >
              WhatsApp
            </a>
          </span>
        ) : (
          '—'
        ),
    },
  ];

  const shopColumns = [
    { key: 'name', label: 'Business', render: (s) => <span className="font-medium text-gray-900">{s.name}</span> },
    { key: 'signedUpAt', label: 'Signed up', render: (s) => formatDate(s.signedUpAt) },
    { key: 'state', label: 'Where it is', render: (s) => shopStatus(s, rules) },
    { key: 'earned', label: 'You earned', align: 'right', render: (s) => formatMoney(s.earned) },
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
    { key: 'status', label: 'Status', render: (e) => <Badge tone={e.status === 'paid' ? 'green' : 'amber'}>{e.status === 'paid' ? `Paid ${e.paidAt ? formatDate(e.paidAt) : ''}` : e.onHold ? `Payable on ${formatDate(e.payableOn)}` : 'Waiting to be paid'}</Badge> },
  ];
  const payoutColumns = [
    { key: 'createdAt', label: 'Date', render: (p) => formatDateTime(p.createdAt) },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => <span className="font-medium">{formatMoney(p.amount)}</span> },
    { key: 'note', label: 'Note' },
  ];
  const logColumns = [
    { key: 'day', label: 'Day', render: (l) => formatDate(l.day) },
    { key: 'visits', label: 'Visits', align: 'right' },
    { key: 'demos', label: 'Demos', align: 'right' },
    { key: 'notes', label: 'Note' },
  ];

  return (
    <>
      <PageHeader title="Sales agent" subtitle={`${agent.rankName} · ID ${agent.agentNo || '—'} · you earn ${agent.rate}% of every renewal payment from your shops.`} />

      {!agent.isActive && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your Sales Agent account is switched off. Contact the Programme Desk. Nothing new is earned while it is off.</div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Your referral code</p>
          <Badge tone={agent.isActive ? 'green' : 'gray'}>{agent.isActive ? 'Active' : 'Switched off'}</Badge>
        </div>
        <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-gray-900">{agent.code}</p>
        <p className="mt-2 break-all text-sm text-gray-500">{link}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <QrImage text={link} size={112} className="rounded-lg border border-gray-200 bg-white p-1" alt={`QR code for ${agent.code}`} />
          <p className="max-w-xs text-xs text-gray-500">Show this to a shop owner: they scan it with their phone camera and land on the sign-up page with your code already filled in.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={agent.code}>Copy code</CopyButton>
          <CopyButton text={link}>Copy sign-up link</CopyButton>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Share on WhatsApp
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-500">Every business must register with your code or link. A business can only ever belong to the first code it used.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Waiting to be paid" value={formatMoney(totals.owed)} sub={totals.held > 0 ? `${formatMoney(totals.held)} is held until ${formatDate(totals.nextPayableOn)}: a New Shop Bonus is paid 30 days after you earn it` : `${formatMoney(totals.paid)} already paid to you`} tone={totals.owed > 0 ? 'amber' : 'gray'} />
        <StatCard label="Total earned" value={formatMoney(totals.earned)} sub={totals.pending > 0 ? `+ ${formatMoney(totals.pending)} more if your ${totals.pendingShops} getting-started shop${totals.pendingShops === 1 ? '' : 's'} get${totals.pendingShops === 1 ? 's' : ''} going` : 'all time'} />
        <StatCard label="Shops activated" value={totals.activated} sub={`of ${totals.shops} registered`} />
        <StatCard label="Paying now" value={totals.payingNow} sub="shops on a paid plan today" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title="This week" action={<Badge tone={week.credited ? 'green' : week.qualifies ? 'teal' : 'gray'}>{week.credited ? 'Bonus credited' : week.qualifies ? 'Targets reached' : `${formatMoney(week.bonus)} bonus`}</Badge>}>
          <div className="space-y-3">
            <Target label="Shops visited" value={week.visits} target={week.targets.visits} />
            <Target label="Demos given" value={week.demos} target={week.targets.demos} />
            <Target label="Businesses registered (with a product added)" value={week.registrations} target={week.targets.registrations} />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Reach all three by Sunday to earn the {formatMoney(week.bonus)} Weekly Activity Bonus. The Programme Desk checks the week, then pays on Friday.
            {last ? ` Last week: ${last.credited ? 'bonus credited' : last.qualifies ? 'targets reached, waiting for the Programme Desk to credit it' : `${last.visits} visits, ${last.demos} demos, ${last.registrations} registrations (targets not reached)`}.` : ''}
          </p>
        </Panel>

        <Panel title="This month" action={<Badge tone="gray">{month.key}</Badge>}>
          <p className="tabular text-3xl font-semibold text-gray-900">
            {month.activated}
            <span className="ml-2 text-sm font-normal text-gray-500">new activated shops</span>
          </p>
          <div className="mt-3 space-y-3">
            {month.milestones.map((m) => (
              <Target key={m.shops} label={`${m.shops} shops: ${formatMoney(m.amount)} bonus`} value={Math.min(month.activated, m.shops)} target={m.shops} />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {month.next ? `${month.next.toGo} more activated shop${month.next.toGo === 1 ? '' : 's'} to the ${formatMoney(month.next.amount)} milestone. ` : 'You have reached the top milestone this month. '}
            Only the highest milestone is paid, and it is paid by the 5th of next month. {`A shop counts once it has paid and added ${rules.products} products and ${rules.sales} sales within ${rules.days} days.`}
          </p>
        </Panel>
      </div>

      {agent.rank === 'agent' && (
        <Panel title="Your next rank" className="mb-6">
          <Target label={`Months in a row with ${rankProgress.shopsPerMonth}+ activated shops`} value={Math.min(rankProgress.streak, rankProgress.neededMonths)} target={rankProgress.neededMonths} />
          <p className="mt-3 text-xs text-gray-500">Do it {rankProgress.neededMonths} months running and you become a Senior Sales Agent: your renewal share goes from 10% to 12%.</p>
        </Panel>
      )}

      <Panel title="Write up your day" className="mb-6">
        <DailyLog key={data.today} data={data} onSaved={() => reload({ quiet: true })} />
        {logs.length > 0 && (
          <div className="mt-5">
            <DataTable columns={logColumns} rows={logs} numbered={false} />
          </div>
        )}
      </Panel>

      {followUp.length > 0 && (
        <Panel title="Follow up: free trials ending" className="mb-6">
          <DataTable columns={followUpColumns} rows={followUp} numbered={false} />
          <p className="mt-3 text-xs text-gray-500">These businesses signed up with your code but have not paid yet. A call before the trial ends is the best chance to turn them into a paying shop.</p>
        </Panel>
      )}

      <Panel title="Shops you registered" className="mb-6">
        {shops.length === 0 ? <p className="text-sm text-gray-500">Nobody has signed up with your code yet.</p> : <DataTable columns={shopColumns} rows={shops} numbered={false} />}
      </Panel>

      <Panel title="Your earnings" className="mb-6">
        {earnings.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing earned yet. You earn the New Shop Bonus when a shop you registered pays and gets going.</p>
        ) : (
          <DataTable columns={earningColumns} rows={earnings} numbered={false} />
        )}
        <p className="mt-3 text-xs text-gray-500">
          By type: New Shop Bonus {formatMoney(totals.byType.new_shop)} · Renewals {formatMoney(totals.byType.renewal)} · Weekly {formatMoney(totals.byType.weekly)} · Milestones {formatMoney(totals.byType.milestone)}
          {totals.byType.adjustment ? ` · Corrections ${formatMoney(totals.byType.adjustment)}` : ''}
        </p>
      </Panel>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Payments sent to you">
          {payouts.length === 0 ? <p className="text-sm text-gray-500">No payments have been sent to you yet.</p> : <DataTable columns={payoutColumns} rows={payouts} numbered={false} />}
        </Panel>

        <Panel title="This month's leaderboard">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">No activated shops yet this month. Be the first on the board.</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((row, i) => (
                <li key={`${row.name}-${i}`} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${row.you ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-gray-50'}`}>
                  <span className="flex items-center gap-3">
                    <span className="tabular w-5 text-gray-400">{i + 1}</span>
                    <span className="font-medium text-gray-900">
                      {row.name}
                      {row.you ? ' (you)' : ''}
                    </span>
                    <span className="hidden text-xs text-gray-500 sm:inline">{row.rank}</span>
                  </span>
                  <span className="tabular font-semibold text-gray-900">{row.shops} shops</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <p className="mb-8 text-xs text-gray-500">
        Payment is by bank transfer to the account you gave the Programme Desk. Never collect cash from a business: every subscription is paid on mylogbase.com. Weekly Bonuses are paid on Fridays; a New Shop Bonus is paid on the first Friday after it is {rules.holdDays} days old; renewals and milestones by the 5th of the next month.
        {' '}Questions? Reach the Programme Desk{desk && desk.phone ? <> on <a href={`tel:${desk.phone}`} className="font-medium text-teal-700 underline">{desk.phone}</a> or</> : ''} at <a href={`mailto:${desk ? desk.email : 'support@mylogbase.com'}`} className="font-medium text-teal-700 underline">{desk ? desk.email : 'support@mylogbase.com'}</a>.
      </p>
    </>
  );
}
