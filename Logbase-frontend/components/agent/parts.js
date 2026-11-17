'use client';

import { Badge, cardClass } from '@/components/ui';

// Shared pieces of the Sales Agent pages (cards, gauges, badges).

export const TYPE_LABEL = {
  new_shop: 'New Shop Bonus',
  renewal: 'Renewal Commission',
  weekly: 'Weekly Activity Bonus',
  milestone: 'Monthly Milestone',
  adjustment: 'Correction',
};

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function Card({ title, action, children, className = '' }) {
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

export function Ring({ label, value, target }) {
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

export function Bar({ value, target, done }) {
  const pct = Math.max(0, Math.min(100, target ? (value / target) * 100 : 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Target({ label, value, target }) {
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

export function Empty({ children }) {
  return <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">{children}</p>;
}

export function Note({ children }) {
  return <p className="mt-4 text-xs leading-relaxed text-gray-500">{children}</p>;
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`${cardClass} p-4 ${tone === 'amber' ? 'ring-1 ring-amber-200' : ''}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export function trialBadge(trial) {
  return (
    <Badge tone={trial.ended ? 'red' : trial.daysLeft <= 3 ? 'amber' : 'gray'}>
      {trial.ended ? `Trial ended ${plural(Math.abs(trial.daysLeft), 'day')} ago` : `Trial ends in ${plural(trial.daysLeft, 'day')}`}
    </Badge>
  );
}

export function shopStatus(s, rules) {
  if (s.state === 'activated') return <Badge tone={s.paying ? 'green' : 'amber'}>{s.paying ? 'Activated and paying' : 'Activated · plan ended'}</Badge>;
  if (s.state === 'activating') return <Badge tone="amber">{`Getting started: ${s.progress.products}/${rules.products} products, ${s.progress.sales}/${rules.sales} sales · ${plural(s.progress.daysLeft, 'day')} left`}</Badge>;
  if (s.state === 'missed') return <Badge tone="gray">Did not get going in time</Badge>;
  if (s.trial) return trialBadge(s.trial);
  return <Badge tone="gray">Not paid yet</Badge>;
}

// The heading at the top of an agent page
export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
