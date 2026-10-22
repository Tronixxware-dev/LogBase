'use client';

// The look of every "details" section in the app: a card with a heading, an optional strip of the key money figures,
// and one tile per fact (a coloured icon, a small label and a bold value). Used by the sale, purchase, repair, laundry
// order, supplier, transfer, IMEI and admin pages, so they all read the same way.

import { Icon } from '@/components/Icons';
import { cardClass } from '@/components/ui';

// Light tints that follow the dark theme too (these colour names are remapped in globals.css)
const CHIP = {
  teal: 'bg-teal-50 text-teal-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  sky: 'bg-sky-50 text-sky-700',
  rose: 'bg-rose-50 text-rose-700',
};

// A fact without an icon of its own gets one from its label ("Phone number" -> a phone, "Date in" -> a calendar...)
const GUESSES = [
  [/phone|whatsapp|call/i, 'phone', 'sky'],
  [/e-?mail/i, 'mail', 'sky'],
  [/address|deliver to|location|country|city|branch|store|^from\b|^to\b/i, 'pin', 'rose'],
  [/note|fault|remark|reason|description|condition|stain|care/i, 'note', 'amber'],
  [/date|recorded|received|created|sent|joined|expires|ends|due|promised|warranty|went out|time/i, 'calendar', 'violet'],
  [/price|total|paid|owed|owe|balance|fee|cost|amount|deposit|deliver(y)? fee|value|credit|discount|refund|top-?up|profit/i, 'naira', 'green'],
  [/method|payment|bank|account/i, 'wallet', 'teal'],
  [/by$|seller|rider|staff|customer|supplier|name|owner|handed|technician|person|user|role/i, 'user', 'sky'],
  [/imei|serial|number|code|qty|quantity|pieces|units|count|stock|colou?r|size|storage|model|item|product/i, 'hash', 'teal'],
  [/status|state|hand-?over|speed|service|delivery/i, 'deliveries', 'teal'],
];

function guess(label) {
  const text = typeof label === 'string' ? label : '';
  const hit = GUESSES.find(([rx]) => rx.test(text));
  return hit ? { icon: hit[1], tone: hit[2] } : { icon: 'note', tone: 'teal' };
}

// The card around a details section: a coloured bar and icon chip in front of the heading.
export function DetailCard({ title, icon = 'note', subtitle, action, children, className = '' }) {
  return (
    <section className={`${cardClass} ${/\bmb-/.test(className) ? '' : 'mb-6'} overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
}

// The key money figures, big and coloured, side by side: [{ label, value, tone: 'brand' | 'good' | 'bad' | 'warn' | 'plain', note }]
export function MoneyStrip({ items, className = 'mb-5' }) {
  const shown = items.filter(Boolean);
  const style = {
    brand: 'brand-gradient text-white',
    good: 'bg-green-50 text-green-700',
    bad: 'bg-red-50 text-red-700',
    warn: 'bg-amber-50 text-amber-700',
    plain: 'bg-gray-100 text-gray-900',
  };
  const cols = shown.length >= 4 ? 'sm:grid-cols-4' : shown.length === 3 ? 'sm:grid-cols-3' : shown.length === 2 ? 'sm:grid-cols-2' : '';
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${cols} ${className}`}>
      {shown.map((m, i) => {
        const brand = m.tone === 'brand';
        return (
          <div
            key={`${m.label}-${i}`}
            className={`rounded-2xl px-4 py-3.5 ${style[m.tone] || style.plain} ${shown.length === 3 && i === 0 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${brand ? 'text-white/70' : 'opacity-80'}`}>{m.label}</p>
            <p className="tabular mt-1 break-words text-xl font-bold leading-tight sm:text-2xl">{m.value}</p>
            {m.note && (
              <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${brand ? 'text-white/70' : 'opacity-80'}`}>
                {m.tone === 'good' && <Icon name="check" className="h-3.5 w-3.5" />}
                {m.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// A smaller heading inside a card ("Customer", "Hand-over"...)
export function DetailSubhead({ title, icon }) {
  return (
    <h3 className="mb-3 mt-6 flex items-center gap-2 border-t border-gray-100 pt-5 text-xs font-semibold uppercase tracking-wider text-gray-500 first:mt-0 first:border-0 first:pt-0">
      {icon && <Icon name={icon} className="h-4 w-4 text-primary" />}
      {title}
    </h3>
  );
}

// The grid the facts sit in: two across on a phone, three on a computer
export function DetailGrid({ children, cols = 3, className = '' }) {
  const wide = cols === 4 ? 'lg:grid-cols-4' : cols === 2 ? '' : 'lg:grid-cols-3';
  return <dl className={`grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 ${wide} ${className}`}>{children}</dl>;
}

// One fact: [icon] LABEL / value. `wide` gives it the whole row (an address, a note). `tone` colours the value (bad = red, good = green).
export function Detail({ label, icon, color, wide, tone, mono, children }) {
  const g = guess(label);
  const chip = CHIP[color || g.tone] || CHIP.teal;
  const empty = children === undefined || children === null || children === '' || children === false;
  const valueTone = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-green-700' : 'text-gray-900';
  return (
    <div className={`group flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 transition hover:border-gray-300 hover:shadow-sm ${wide ? 'col-span-full' : ''}`}>
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        <Icon name={icon || g.icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</dt>
        <dd className={`mt-0.5 break-words text-[15px] font-semibold leading-snug ${empty ? 'text-gray-300' : valueTone} ${mono ? 'font-mono' : ''} ${wide ? 'whitespace-pre-wrap' : ''}`}>
          {empty ? '—' : children}
        </dd>
      </div>
    </div>
  );
}

// A fact on one line, for long lists of them (the admin pages): [icon] label ........ value
export function DetailRow({ label, icon, color, children }) {
  const g = guess(label);
  const chip = CHIP[color || g.tone] || CHIP.teal;
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="flex min-w-0 items-center gap-2.5 text-gray-500">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chip}`}>
          <Icon name={icon || g.icon} className="h-4 w-4" />
        </span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="min-w-0 text-right font-semibold text-gray-900">{children}</dd>
    </div>
  );
}
