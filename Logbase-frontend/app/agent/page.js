'use client';

import { useState } from 'react';
import { Badge, ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass } from '@/components/ui';
import { getMyAgent, saveAgentLog } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { useLoad } from '@/components/admin/ui';
import { useUser } from '@/components/UserProvider';
import CopyButton from '@/components/admin/CopyButton';
import { signupLink } from '@/lib/referrals';
import QrImage from '@/components/QrImage';

// A Sales Agent's own home: what they are owed, their code, this week's targets, this month's milestone, every shop they
// brought and what they earned. The pay plan is the one in the Sales Agent Programme Handbook (the server works everything
// out; see utils/agents.js). This page only shows it.

const TYPE_LABEL = {
  new_shop: 'New Shop Bonus',
  renewal: 'Renewal Commission',
  weekly: 'Weekly Activity Bonus',
  milestone: 'Monthly Milestone',
  adjustment: 'Correction',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'shops', label: 'Shops' },
  { id: 'money', label: 'Money' },
  { id: 'log', label: 'Daily log' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Card({ title, action, children, className = '' }) {
  return (
    <section className={`${cardClass} p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold tracking-tight text-gray-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// A round progress gauge: the number done out of the target, with its name underneath.
function Ring({ label, value, target }) {
  const done = value >= target;
  const pct = Math.max(0, Math.min(1, target ? value / target : 0));
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-24 w-24 sm:h-28 sm:w-28">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={R} fill="none" strokeWidth="7" className="stroke-gray-100" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            className={`transition-all duration-700 ${done ? 'stroke-emerald-500' : 'stroke-teal-500'}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`tabular text-xl font-semibold leading-none sm:text-2xl ${done ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</span>
          <span className="mt-0.5 text-[11px] text-gray-400">of {target}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium leading-tight text-gray-600">{label}</p>
    </div>
  );
}

function Bar({ value, target, done }) {
  const pct = Math.max(0, Math.min(100, target ? (value / target) * 100 : 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Target({ label, value, target }) {
  const done = value >= target;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`tabular shrink-0 font-semibold ${done ? 'text-emerald-600' : 'text-gray-900'}`}>
          {value} / {target}
        </span>
      </div>
      <Bar value={value} target={target} done={done} />
    </div>
  );
}

function Empty({ children }) {
  return <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">{children}</p>;
}

function Note({ children }) {
  return <p className="mt-4 text-xs leading-relaxed text-gray-500">{children}</p>;
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`${cardClass} p-4 ${tone === 'amber' ? 'ring-1 ring-amber-200' : ''}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function trialBadge(trial) {
  return (
    <Badge tone={trial.ended ? 'red' : trial.daysLeft <= 3 ? 'amber' : 'gray'}>
      {trial.ended ? `Trial ended ${plural(Math.abs(trial.daysLeft), 'day')} ago` : `Trial ends in ${plural(trial.daysLeft, 'day')}`}
    </Badge>
  );
}

function shopStatus(s, rules) {
  if (s.state === 'activated') return <Badge tone={s.paying ? 'green' : 'amber'}>{s.paying ? 'Activated and paying' : 'Activated · plan ended'}</Badge>;
  if (s.state === 'activating') return <Badge tone="amber">{`Getting started: ${s.progress.products}/${rules.products} products, ${s.progress.sales}/${rules.sales} sales · ${plural(s.progress.daysLeft, 'day')} left`}</Badge>;
  if (s.state === 'missed') return <Badge tone="gray">Did not get going in time</Badge>;
  if (s.trial) return trialBadge(s.trial);
  return <Badge tone="gray">Not paid yet</Badge>;
}

/* ------------------------------------------------------------------ */
/* Top of the page                                                    */
/* ------------------------------------------------------------------ */

function Hero({ name, agent, totals }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  return (
    <section className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-teal-50/85">{greeting()},</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{first}</h1>
        </div>
        <span className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur">{agent.rankName}</span>
      </div>

      <div className="relative mt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-teal-50/80">Waiting to be paid</p>
        <p className="tabular mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{formatMoney(totals.owed)}</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-teal-50/80">
          {totals.held > 0 ? `${formatMoney(totals.held)} of it is held until ${formatDate(totals.nextPayableOn)}. A New Shop Bonus is paid 30 days after you earn it.` : 'Paid to your bank account by the Programme Desk.'}
        </p>
      </div>

      <dl className="relative mt-6 grid grid-cols-3 gap-2 border-t border-white/20 pt-4 text-center sm:text-left">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-teal-50/75">Total earned</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold sm:text-lg">{formatMoney(totals.earned)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-teal-50/75">Paid to you</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold sm:text-lg">{formatMoney(totals.paid)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-teal-50/75">Shops paying</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold sm:text-lg">{totals.payingNow}</dd>
        </div>
      </dl>

      <p className="relative mt-4 text-[11px] text-teal-50/70">
        ID {agent.agentNo || '—'} · you earn {agent.rate}% of every renewal payment from your shops
      </p>
    </section>
  );
}

function CodeCard({ agent }) {
  const link = signupLink(agent.code);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Stop keeping your sales and stock in a notebook. Start free on LogBase: ${link}`)}`;
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Your referral code</p>
        <Badge tone={agent.isActive ? 'green' : 'gray'}>{agent.isActive ? 'Active' : 'Switched off'}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-3xl font-bold tracking-[0.18em] text-gray-900 sm:text-4xl">{agent.code}</p>
          <p className="mt-2 truncate text-xs text-gray-500">{link.replace(/^https?:\/\//, '')}</p>
        </div>
        <QrImage text={link} size={104} className="shrink-0 rounded-xl border border-gray-200 bg-white p-1.5" alt={`QR code for ${agent.code}`} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <CopyButton text={agent.code} className="justify-center">Copy code</CopyButton>
        <CopyButton text={link} className="justify-center">Copy link</CopyButton>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark sm:col-span-1"
        >
          Share on WhatsApp
        </a>
      </div>
      <Note>
        Show the QR code to a shop owner: they scan it with their phone camera and land on the sign-up page with your code already filled in. Every business must register with your code or link, and belongs to the first code it used.
      </Note>
    </Card>
  );
}

function TabBar({ tab, setTab, badges }) {
  return (
    <div className="sticky top-[4.25rem] z-20 -mx-4 bg-background/90 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none" role="tablist">
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1 [scrollbar-width:none]">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {badges[t.id] > 0 && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{badges[t.id]}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Daily log                                                          */
/* ------------------------------------------------------------------ */

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
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 sm:col-span-1">
        <Field label="Day">
          <select value={day} onChange={(e) => pick(e.target.value)} className={inputClass}>
            {days.map((d) => (
              <option key={d} value={d}>
                {d === data.today ? 'Today' : formatDate(d)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Shops visited">
        <input type="number" min="0" max="500" inputMode="numeric" value={visits} onChange={(e) => setVisits(e.target.value)} className={inputClass} placeholder="0" />
      </Field>
      <Field label="Demos given">
        <input type="number" min="0" max="500" inputMode="numeric" value={demos} onChange={(e) => setDemos(e.target.value)} className={inputClass} placeholder="0" />
      </Field>
      <div className="col-span-2 flex items-end sm:col-span-1">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full`}>
          {saving ? 'Saving…' : 'Save my day'}
        </button>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Field label="Note (optional)" hint="Who was interested, who to follow up. Only you and the Programme Desk see this.">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className={inputClass} />
        </Field>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <ErrorBanner message={problem} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                               */
/* ------------------------------------------------------------------ */

function Overview({ data, followUp, goShops }) {
  const { agent, week, month, rankProgress, leaderboard, rules } = data;
  const last = week.last;
  const urgent = followUp.filter((s) => s.trial.ended || s.trial.daysLeft <= 3);
  return (
    <div className="space-y-4">
      {urgent.length > 0 && (
        <button
          type="button"
          onClick={goShops}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100/70"
        >
          <span>
            <span className="block text-sm font-semibold text-amber-900">{plural(urgent.length, 'free trial')} {urgent.length === 1 ? 'is' : 'are'} ending</span>
            <span className="block text-xs text-amber-800">A call today is your best chance to turn {urgent.length === 1 ? 'it' : 'them'} into paying shops.</span>
          </span>
          <span className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">See who</span>
        </button>
      )}

      <Card title="This week" action={<Badge tone={week.credited ? 'green' : week.qualifies ? 'teal' : 'gray'}>{week.credited ? 'Bonus credited' : week.qualifies ? 'Targets reached' : `${formatMoney(week.bonus)} bonus`}</Badge>}>
        <div className="grid grid-cols-3 gap-2">
          <Ring label="Shops visited" value={week.visits} target={week.targets.visits} />
          <Ring label="Demos given" value={week.demos} target={week.targets.demos} />
          <Ring label="Businesses registered" value={week.registrations} target={week.targets.registrations} />
        </div>
        <Note>
          Reach all three by Sunday to earn the {formatMoney(week.bonus)} Weekly Activity Bonus. A registration counts once the business has added a product. The Programme Desk checks the week, then pays on Friday.
          {last ? ` Last week: ${last.credited ? 'bonus credited' : last.qualifies ? 'targets reached, waiting for the Programme Desk to credit it' : `${last.visits} visits, ${last.demos} demos, ${last.registrations} registrations (targets not reached)`}.` : ''}
        </Note>
      </Card>

      <Card title="This month" action={<Badge tone="gray">{month.key}</Badge>}>
        <p className="tabular text-4xl font-semibold tracking-tight text-gray-900">
          {month.activated}
          <span className="ml-2 text-sm font-normal text-gray-500">new activated shops</span>
        </p>
        <div className="mt-4 space-y-4">
          {month.milestones.map((m) => (
            <Target key={m.shops} label={`${m.shops} shops: ${formatMoney(m.amount)} bonus`} value={Math.min(month.activated, m.shops)} target={m.shops} />
          ))}
        </div>
        <Note>
          {month.next ? `${plural(month.next.toGo, 'more activated shop')} to the ${formatMoney(month.next.amount)} milestone. ` : 'You have reached the top milestone this month. '}
          Only the highest milestone is paid, by the 5th of next month. A shop counts once it has paid and added {rules.products} products and {rules.sales} sales within {rules.days} days.
        </Note>
      </Card>

      {agent.rank === 'agent' && (
        <Card title="Your next rank">
          <Target label={`Months in a row with ${rankProgress.shopsPerMonth}+ activated shops`} value={Math.min(rankProgress.streak, rankProgress.neededMonths)} target={rankProgress.neededMonths} />
          <Note>Do it {rankProgress.neededMonths} months running and you become a Senior Sales Agent: your renewal share goes from 10% to 12%.</Note>
        </Card>
      )}

      <Card title="This month's leaderboard">
        {leaderboard.length === 0 ? (
          <Empty>No activated shops yet this month. Be the first on the board.</Empty>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((row, i) => (
              <li
                key={`${row.name}-${i}`}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ${row.you ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-gray-50'}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">
                      {row.name}
                      {row.you ? ' (you)' : ''}
                    </span>
                    <span className="block text-[11px] text-gray-500">{row.rank}</span>
                  </span>
                </span>
                <span className="tabular shrink-0 font-semibold text-gray-900">{row.shops} shops</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function ShopsTab({ data, followUp }) {
  const { shops, totals, rules } = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Registered" value={totals.shops} />
        <Stat label="Activated" value={totals.activated} />
        <Stat label="Paying now" value={totals.payingNow} />
      </div>

      {followUp.length > 0 && (
        <Card title="Follow up: free trials ending" action={<Badge tone="amber">{followUp.length}</Badge>}>
          <ul className="divide-y divide-gray-100">
            {followUp.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                  <div className="mt-1">{trialBadge(s.trial)}</div>
                </div>
                {s.phone ? (
                  <div className="flex gap-2">
                    <a href={`tel:${s.phone}`} className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark">
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${String(s.phone).replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hello ${s.name}, your free LogBase trial is ending soon. Subscribe on mylogbase.com to keep your sales and stock safe.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      WhatsApp
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No phone number</span>
                )}
              </li>
            ))}
          </ul>
          <Note>These businesses signed up with your code but have not paid yet.</Note>
        </Card>
      )}

      <Card title="Shops you registered">
        {shops.length === 0 ? (
          <Empty>Nobody has signed up with your code yet. Show your QR code to your first shop owner.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shops.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="mb-1.5 text-xs text-gray-500">Signed up {formatDate(s.signedUpAt)}</p>
                  {shopStatus(s, rules)}
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-semibold text-gray-900">{formatMoney(s.earned)}</p>
                  <p className="text-[11px] text-gray-400">you earned</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function MoneyTab({ data }) {
  const { totals, earnings, payouts, rules } = data;
  const types = [
    ['New Shop Bonus', totals.byType.new_shop],
    ['Renewals', totals.byType.renewal],
    ['Weekly bonuses', totals.byType.weekly],
    ['Milestones', totals.byType.milestone],
    ...(totals.byType.adjustment ? [['Corrections', totals.byType.adjustment]] : []),
  ];
  const top = Math.max(1, ...types.map(([, v]) => Math.abs(v || 0)));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Waiting to be paid" value={formatMoney(totals.owed)} tone={totals.owed > 0 ? 'amber' : undefined} sub={totals.held > 0 ? `${formatMoney(totals.payable)} payable now` : undefined} />
        <Stat label="Held" value={formatMoney(totals.held)} sub={totals.held > 0 ? `until ${formatDate(totals.nextPayableOn)}` : 'nothing on hold'} />
        <div className="col-span-2 sm:col-span-1">
          <Stat label="Paid to you" value={formatMoney(totals.paid)} sub="all time" />
        </div>
      </div>

      <Card title="Where your money comes from">
        <ul className="space-y-3">
          {types.map(([label, value]) => (
            <li key={label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="tabular font-semibold text-gray-900">{formatMoney(value || 0)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(0, Math.min(100, ((value || 0) / top) * 100))}%` }} />
              </div>
            </li>
          ))}
        </ul>
        {totals.pending > 0 && (
          <Note>
            + {formatMoney(totals.pending)} more if your {plural(totals.pendingShops, 'getting-started shop')} get{totals.pendingShops === 1 ? 's' : ''} going.
          </Note>
        )}
      </Card>

      <Card title="Your earnings">
        {earnings.length === 0 ? (
          <Empty>Nothing earned yet. You earn the New Shop Bonus when a shop you registered pays and gets going.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {earnings.map((e, i) => (
              <li key={e._id || i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{TYPE_LABEL[e.type] || e.type}</p>
                  <p className="truncate text-xs text-gray-500">
                    {[e.businessName || e.note, e.type === 'renewal' && e.ratePercent ? `${e.ratePercent}% of ${formatMoney(e.paymentAmount)}` : ''].filter(Boolean).join(' · ') || ' '}
                  </p>
                  <p className="text-[11px] text-gray-400">{formatDateTime(e.earnedAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`tabular text-sm font-semibold ${e.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatMoney(e.amount)}</p>
                  <div className="mt-1">
                    <Badge tone={e.status === 'paid' ? 'green' : 'amber'}>{e.status === 'paid' ? `Paid${e.paidAt ? ` ${formatDate(e.paidAt)}` : ''}` : e.onHold ? `Payable ${formatDate(e.payableOn)}` : 'Waiting to be paid'}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Payments sent to you">
        {payouts.length === 0 ? (
          <Empty>No payments have been sent to you yet.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {payouts.map((p, i) => (
              <li key={p._id || i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(p.createdAt)}</p>
                  {p.note && <p className="truncate text-xs text-gray-500">{p.note}</p>}
                </div>
                <p className="tabular shrink-0 text-sm font-semibold text-gray-900">{formatMoney(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
        <Note>
          Payment is by bank transfer to the account you gave the Programme Desk. Weekly Bonuses are paid on Fridays; a New Shop Bonus on the first Friday after it is {rules.holdDays} days old; renewals and milestones by the 5th of the next month.
        </Note>
      </Card>
    </div>
  );
}

function LogTab({ data, reload }) {
  const { logs } = data;
  return (
    <div className="space-y-4">
      <Card title="Write up your day">
        <DailyLog key={data.today} data={data} onSaved={() => reload({ quiet: true })} />
      </Card>
      <Card title="Your last days">
        {logs.length === 0 ? (
          <Empty>Nothing written up yet. Add today's visits and demos above.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((l) => (
              <li key={l.day} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatDate(l.day)}</p>
                  {l.notes && <p className="truncate text-xs text-gray-500">{l.notes}</p>}
                </div>
                <p className="tabular shrink-0 text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{l.visits}</span> visits · <span className="font-semibold text-gray-900">{l.demos}</span> demos
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function HelpCard({ desk }) {
  const email = desk ? desk.email : 'support@mylogbase.com';
  return (
    <section className={`${cardClass} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">Programme Desk</p>
        <p className="mt-0.5 text-xs text-gray-500">Questions about a payment, a shop or your code? We reply fast. Never collect cash from a business: every subscription is paid on mylogbase.com.</p>
      </div>
      <div className="flex gap-2">
        {desk && desk.phone && (
          <a href={`tel:${desk.phone}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark">
            Call
          </a>
        )}
        <a href={`mailto:${email}`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
          Email
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                           */
/* ------------------------------------------------------------------ */

export default function SalesAgentPage() {
  const { user } = useUser();
  const { data, error, loading, reload } = useLoad(() => getMyAgent(), []);
  const [tab, setTab] = useState('overview');

  if (loading && !data) return <LoadingState />;
  if (!data) return <ErrorBanner message={error || 'Could not load your page'} />;
  if (!data.agent) return <Empty>There is no Sales Agent record linked to your account.</Empty>;

  const { agent, totals, shops, desk } = data;
  // shops that signed up but have not paid: the ones whose trial is about to end (or just ended) come first
  const followUp = shops
    .filter((s) => s.state === 'not_paid' && s.trial)
    .sort((a, b) => a.trial.daysLeft - b.trial.daysLeft)
    .slice(0, 30);

  return (
    <div className="space-y-5">
      {!agent.isActive && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your Sales Agent account is switched off. Contact the Programme Desk. Nothing new is earned while it is off.
        </div>
      )}

      <Hero name={user.name || agent.name} agent={agent} totals={totals} />
      <CodeCard agent={agent} />

      <TabBar tab={tab} setTab={setTab} badges={{ shops: followUp.filter((s) => s.trial.ended || s.trial.daysLeft <= 3).length }} />

      <div role="tabpanel">
        {tab === 'overview' && <Overview data={data} followUp={followUp} goShops={() => setTab('shops')} />}
        {tab === 'shops' && <ShopsTab data={data} followUp={followUp} />}
        {tab === 'money' && <MoneyTab data={data} />}
        {tab === 'log' && <LogTab data={data} reload={reload} />}
      </div>

      <HelpCard desk={desk} />
    </div>
  );
}
