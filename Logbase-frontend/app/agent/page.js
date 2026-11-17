'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, cardClass } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import { useAgent } from '@/components/agent/AgentData';
import CopyButton from '@/components/admin/CopyButton';
import { signupLink } from '@/lib/referrals';
import QrImage from '@/components/QrImage';
import Avatar from '@/components/Avatar';
import { Card, Empty, Note, Ring, Target, greeting, plural } from '@/components/agent/parts';

// A Sales Agent's home: what they are owed, their code, today's write-up, this week's targets and this month's milestone.
// The pay plan is the one in the Sales Agent Programme Handbook (the server works everything out; see utils/agents.js).

function Hero({ name, photoUrl, agent, totals }) {
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
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/agent/profile" aria-label="Your profile">
            <Avatar name={name} photoUrl={photoUrl} size="lg" tone="light" className="ring-2 ring-white/40" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-teal-50/85">{greeting()},</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{first}</h1>
          </div>
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
          <Note>Do it {rankProgress.neededMonths} months running and you become a Senior Sales Agent: your renewal share goes from 10% to 20%.</Note>
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

// today's write-up: one tap to the daily log
function LogNudge({ data }) {
  const today = data.logs.find((l) => l.day === data.today);
  return (
    <Link href="/agent/log" className={`${cardClass} flex items-center justify-between gap-3 p-4 transition hover:shadow-md sm:p-5`}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{today ? "Today's day is written up" : 'Write up your day'}</span>
        <span className="block text-xs text-gray-500">{today ? `${today.visits} visits · ${today.demos} demos. Tap to change it.` : 'Add the shops you visited and the demos you gave. It counts towards your weekly bonus.'}</span>
      </span>
      <Badge tone={today ? 'green' : 'amber'}>{today ? 'Done' : 'To do'}</Badge>
    </Link>
  );
}

export default function AgentHomePage() {
  const router = useRouter();
  const { user } = useUser();
  const { data } = useAgent();
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
      <Hero name={user.name || agent.name} photoUrl={user.photoUrl} agent={agent} totals={totals} />
      <CodeCard agent={agent} />
      <LogNudge data={data} />
      <Overview data={data} followUp={followUp} goShops={() => router.push('/agent/shops')} />
      <HelpCard desk={desk} />
    </div>
  );
}
