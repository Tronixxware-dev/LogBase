'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import AnimatedNumber from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icons';
import { StatusBadge, cardClass, secondaryButtonClass } from '@/components/ui';
import { BarList, SegmentBar, STATUS_COLORS, compactMoney } from '@/components/charts';
import { timeAgo } from '@/components/admin/ui';
import { formatMoney } from '@/lib/format';

/*
  Admin panel > Sales & Stock: a DEMO page for videos and posts.

  The sales figures are made up and nothing is read from the database, so it never shows a real business, owner,
  staff member or customer. Product prices are real Jiji.ng / Computer Village prices (see the note above PRODUCTS).

  To change the story the numbers tell, edit the blocks marked "EDIT HERE" below:
    1. BUSINESS      how big the sample shop is and how fast it is growing
    2. PRODUCTS      what is on the shelves (name, category, units in stock, price, reorder level)
    3. SELLING MIX   which categories sell the most
    4. RECENT_SALES  the "Recorded sales" list (minutesAgo = how long ago it was sold)
  The numbers are the same every time the page opens, so a recording always looks the same.

  "Presentation mode" hides the admin sidebar and top bar (they show your own name and email).
  Press Esc, or hover the top-right corner, to leave it.
*/

/* ================================================================== */
/* EDIT HERE 1: the sample shop                                        */
/* ================================================================== */

const BUSINESS = {
  averageDailySales: 1450000, // naira sold on an average day
  growth: 0.6, // how much busier the last day is than the first of the 180 days: 0.6 = about 2x busier (try 0.3 for slower growth)
  averageSale: 230000, // naira in an average sale
  unitsPerSale: 1.7, // items in an average sale
  collectedShare: 0.94, // share of the money already received (the rest is still owed by customers)
  customersShare: 0.86, // customers served, as a share of the sales made (some customers buy more than once)
};

// Monday first. A higher number means busier days (Saturday is the busiest in this sample).
const WEEKDAY_WEIGHT = { 1: 0.9, 2: 0.95, 3: 1.0, 4: 1.05, 5: 1.25, 6: 1.5, 0: 0.7 };

// how customers paid (adds up to 1). Cash is set so that the 30-day view shows about ₦3.18 million in cash.
const PAYMENT_MIX = [
  { method: 'Transfer', share: 0.62 },
  { method: 'Cash', share: 0.05595021 },
  { method: 'Card / POS', share: 0.32404979 },
];

/* ================================================================== */
/* EDIT HERE 2: what is on the shelves                                 */
/* ================================================================== */

// qty = units in stock, price = selling price in naira, low = "low stock" when qty is at or below this
// Prices are the middle (median) asking prices on Jiji.ng from Ikeja / Computer Village sellers, taken in October 2026:
// brand new for the phones, tablet and accessories; used for the MacBook and the two business laptops.
// Market prices move often, so check them again before you record a new video.
const PRODUCTS = [
  { name: 'iPhone 15 Pro Max 256GB', category: 'Phones', qty: 14, price: 1100000, low: 4 },
  { name: 'iPhone 15 128GB', category: 'Phones', qty: 20, price: 695000, low: 5 },
  { name: 'iPhone 14 128GB', category: 'Phones', qty: 22, price: 435000, low: 5 },
  { name: 'Samsung Galaxy S25 Ultra 256GB', category: 'Phones', qty: 9, price: 1130000, low: 3 },
  { name: 'Samsung Galaxy A56 5G 256GB', category: 'Phones', qty: 24, price: 515000, low: 6 },
  { name: 'Samsung Galaxy A36 5G 256GB', category: 'Phones', qty: 30, price: 420000, low: 8 },
  { name: 'Samsung Galaxy A26 128GB', category: 'Phones', qty: 0, price: 315000, low: 8 },
  { name: 'Infinix Note 50 Pro 256GB', category: 'Phones', qty: 40, price: 410000, low: 10 },

  { name: 'MacBook Air M2 256GB', category: 'Laptops', qty: 9, price: 1150000, low: 3 },
  { name: 'HP EliteBook 840 G8', category: 'Laptops', qty: 16, price: 580000, low: 4 },
  { name: 'Lenovo ThinkPad T14', category: 'Laptops', qty: 3, price: 600000, low: 4 },

  { name: 'iPad (2025) 128GB', category: 'Tablets', qty: 8, price: 610000, low: 3 },

  { name: 'AirPods Pro 2', category: 'Audio', qty: 35, price: 200000, low: 8 },
  { name: 'JBL Flip 6', category: 'Audio', qty: 18, price: 135000, low: 5 },

  { name: '25W Fast Charger', category: 'Accessories', qty: 240, price: 15000, low: 40 },
  { name: 'USB-C Fast Charging Cable', category: 'Accessories', qty: 380, price: 5500, low: 60 },
  { name: 'Oraimo Power Bank 20000mAh', category: 'Accessories', qty: 85, price: 18500, low: 20 },
];

/* ================================================================== */
/* EDIT HERE 3: what sells                                             */
/* ================================================================== */

// share of the units sold and of the money, by category (each column adds up to 1)
const SELLING_MIX = {
  Phones: { units: 0.38, money: 0.55 },
  Accessories: { units: 0.32, money: 0.08 },
  Audio: { units: 0.11, money: 0.06 },
  Laptops: { units: 0.12, money: 0.28 },
  Tablets: { units: 0.07, money: 0.03 },
};

/* ================================================================== */
/* EDIT HERE 4: the "Recorded sales" list (newest first)               */
/* ================================================================== */

// product must match a name in PRODUCTS (it gives the price). status: paid | partial | credit
const RECENT_SALES = [
  { product: 'iPhone 15 Pro Max 256GB', quantity: 1, minutesAgo: 3, status: 'paid' },
  { product: '25W Fast Charger', quantity: 4, minutesAgo: 11, status: 'paid' },
  { product: 'HP EliteBook 840 G8', quantity: 2, minutesAgo: 24, status: 'partial' },
  { product: 'Samsung Galaxy A36 5G 256GB', quantity: 3, minutesAgo: 38, status: 'paid' },
  { product: 'AirPods Pro 2', quantity: 1, minutesAgo: 52, status: 'paid' },
  { product: 'Samsung Galaxy S25 Ultra 256GB', quantity: 1, minutesAgo: 75, status: 'paid' },
  { product: 'USB-C Fast Charging Cable', quantity: 10, minutesAgo: 96, status: 'paid' },
  { product: 'MacBook Air M2 256GB', quantity: 1, minutesAgo: 130, status: 'paid' },
  { product: 'Infinix Note 50 Pro 256GB', quantity: 2, minutesAgo: 175, status: 'credit' },
  { product: 'Oraimo Power Bank 20000mAh', quantity: 3, minutesAgo: 220, status: 'paid' },
  { product: 'iPad (2025) 128GB', quantity: 1, minutesAgo: 290, status: 'paid' },
  { product: 'Samsung Galaxy A56 5G 256GB', quantity: 2, minutesAgo: 340, status: 'paid' },
];

/* ================================================================== */
/* Below this line you do not need to change anything                  */
/* ================================================================== */

const DAY = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 180; // enough for 90 days plus the 90 before them (to compare)

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

// Monday first (getDay(): 0 = Sunday)
const WEEKDAYS = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
];

const TINTS = {
  teal: { chip: 'bg-teal-100 text-teal-700', glow: 'bg-teal-300/40' },
  violet: { chip: 'bg-violet-50 text-violet-700', glow: 'bg-violet-300/40' },
  green: { chip: 'bg-green-100 text-green-700', glow: 'bg-green-300/40' },
  amber: { chip: 'bg-amber-100 text-amber-700', glow: 'bg-amber-300/50' },
};

// a small random-number maker that gives the same numbers every time (so a recording always looks the same)
function seeded(seed) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function plural(n, word) {
  return `${Number(n).toLocaleString()} ${word}${Number(n) === 1 ? '' : 's'}`;
}

function sum(rows, key) {
  return rows.reduce((s, r) => s + r[key], 0);
}

// One made-up day per row, oldest first, ending today.
function buildHistory() {
  const rand = seeded(2026);
  const today = startOfDay(new Date());
  const rows = [];
  for (let i = 0; i < HISTORY_DAYS; i += 1) {
    const date = new Date(today.getTime() - (HISTORY_DAYS - 1 - i) * DAY);
    const trend = 1 - BUSINESS.growth / 2 + BUSINESS.growth * (i / (HISTORY_DAYS - 1));
    const noise = 0.85 + rand() * 0.3;
    const total = Math.round((BUSINESS.averageDailySales * (WEEKDAY_WEIGHT[date.getDay()] || 1) * trend * noise) / 1000) * 1000;
    const count = Math.max(1, Math.round(total / (BUSINESS.averageSale * (0.9 + rand() * 0.2))));
    const units = Math.max(count, Math.round(count * BUSINESS.unitsPerSale * (0.9 + rand() * 0.2)));
    const paid = Math.round(total * Math.min(1, BUSINESS.collectedShare + (rand() - 0.5) * 0.04));
    rows.push({ date, total, count, units, paid });
  }
  return rows;
}

// The shelves right now (the same whatever period is chosen).
function buildStock() {
  const byCategory = new Map();
  let units = 0;
  let value = 0;
  let low = 0;
  let out = 0;
  for (const p of PRODUCTS) {
    units += p.qty;
    value += p.qty * p.price;
    if (p.qty <= 0) out += 1;
    else if (p.qty <= p.low) low += 1;
    const c = byCategory.get(p.category) || { label: p.category, units: 0, products: 0 };
    c.units += p.qty;
    c.products += 1;
    byCategory.set(p.category, c);
  }
  const categories = Array.from(byCategory.values()).sort((a, b) => b.units - a.units);
  return { products: PRODUCTS.length, units, value, low, out, ok: PRODUCTS.length - low - out, categories };
}

function buildDemo(days) {
  const history = buildHistory();
  const current = history.slice(-days);
  const previous = history.slice(-days * 2, -days);

  const revenue = sum(current, 'total');
  const units = sum(current, 'units');
  const count = sum(current, 'count');
  const collected = sum(current, 'paid');

  // how customers paid (the last row takes what is left, so the rows add up exactly)
  let left = revenue;
  const methods = PAYMENT_MIX.map((m, i) => {
    const total = i === PAYMENT_MIX.length - 1 ? left : Math.round(revenue * m.share);
    left -= total;
    return { label: m.method, total };
  });

  const soldCategories = Object.entries(SELLING_MIX)
    .map(([label, mix]) => ({ label, units: Math.round(units * mix.units), total: Math.round(revenue * mix.money) }))
    .sort((a, b) => b.units - a.units);

  const stock = buildStock();

  // how long each category's stock will last at the pace it sold (shortest first)
  const soldByLabel = new Map(soldCategories.map((c) => [c.label, c.units]));
  const cover = stock.categories
    .filter((c) => (soldByLabel.get(c.label) || 0) > 0)
    .map((c) => {
      const perDay = soldByLabel.get(c.label) / days;
      return { label: c.label, units: c.units, perDay, daysLeft: c.units / perDay };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const now = Date.now();
  const recent = RECENT_SALES.map((s, i) => {
    const product = PRODUCTS.find((p) => p.name === s.product) || PRODUCTS[0];
    return {
      id: `demo-${i}`,
      product: product.name,
      quantity: s.quantity,
      unitPrice: product.price,
      total: product.price * s.quantity,
      status: s.status,
      date: new Date(now - s.minutesAgo * 60000),
    };
  });

  return {
    days,
    sales: {
      revenue,
      previousRevenue: sum(previous, 'total'),
      count,
      units,
      collected,
      owed: Math.max(0, revenue - collected),
      customers: Math.round(count * BUSINESS.customersShare),
    },
    byDay: current,
    methods,
    stock,
    soldCategories,
    cover,
    recent,
  };
}

function coverText(row) {
  if (row.units <= 0) return 'Out of stock';
  if (row.daysLeft < 1) return 'Less than a day left';
  const d = Math.round(row.daysLeft);
  return `About ${d} ${d === 1 ? 'day' : 'days'} left`;
}

function coverColor(row) {
  if (row.units <= 0 || row.daysLeft <= 3) return STATUS_COLORS.out;
  if (row.daysLeft <= 10) return STATUS_COLORS.low;
  return STATUS_COLORS.ok;
}

/* ------------------------------------------------------------------ */
/* The sales chart: one column per day plus a 7-day average line       */
/* ------------------------------------------------------------------ */

const COLUMN_COLOR = '#0d9488'; // brand teal, drawn soft; the average line is the same hue, darker
const AVERAGE_COLOR = '#0f766e';

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

const shortDay = (date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDay = (date) => new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

// a column with rounded top corners and a flat bottom that sits on the baseline
function columnPath(x, top, w, h) {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${top + h} Z`;
}

// data: [{ date, sales }] one row per day
function SalesChart({ data, height = 280 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.max(280, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = data.length;
  const margin = { top: 28, right: 12, bottom: 28, left: 54 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // the average of each day and the six days before it (the first days use the days that exist)
  const average = data.map((_, i) => {
    const from = Math.max(0, i - 6);
    const window = data.slice(from, i + 1);
    return window.reduce((s, d) => s + d.sales, 0) / window.length;
  });

  const maxValue = Math.max(1, ...data.map((d) => d.sales));
  const step = niceStep(maxValue / 4);
  const top = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1; v += step) ticks.push(v);

  const slot = innerW / n;
  const barW = Math.max(2, Math.min(34, slot * 0.64));
  const xCenter = (i) => margin.left + slot * i + slot / 2;
  const y = (v) => margin.top + innerH * (1 - v / top);

  const peakIndex = data.reduce((best, d, i) => (d.sales > data[best].sales ? i : best), 0);

  const linePoints = average.map((v, i) => `${i === 0 ? 'M' : 'L'}${xCenter(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // as many date labels as fit (about one per 64px), counting back from today so the last day is always named
  const maxLabels = Math.max(2, Math.floor(innerW / 64));
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels));
  const labelIdx = data.map((_, i) => i).filter((i) => (n - 1 - i) % labelEvery === 0);

  function indexFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = Math.floor((e.clientX - rect.left - margin.left) / slot);
    return Math.min(n - 1, Math.max(0, raw));
  }

  const active = hover != null ? data[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(xCenter(hover), 96), width - 96) : 0;
  const peakLeft = Math.min(Math.max(xCenter(peakIndex), 44), width - 44);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLUMN_COLOR, opacity: 0.45 }} />
          Sales each day
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: AVERAGE_COLOR }} />
          7-day average
        </span>
      </div>

      <div ref={wrapRef} className="relative" style={{ height }}>
        <svg width={width} height={height} role="img" aria-label="Sales each day with a 7-day average line" className="block select-none">
          {/* quiet grid and money labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-gray-200"
                strokeWidth="1"
                strokeDasharray={t === 0 ? undefined : '3 5'}
              />
              <text x={margin.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-gray-400">
                {compactMoney(t)}
              </text>
            </g>
          ))}

          {/* date labels */}
          {labelIdx.map((i) => (
            <text key={i} x={xCenter(i)} y={height - 8} textAnchor="middle" fontSize="11" className="fill-gray-400">
              {shortDay(data[i].date)}
            </text>
          ))}

          {/* one column per day; the day under the pointer is drawn in full colour */}
          {data.map((d, i) => (
            <path
              key={String(d.date)}
              d={columnPath(xCenter(i) - barW / 2, y(d.sales), barW, y(0) - y(d.sales))}
              fill={COLUMN_COLOR}
              fillOpacity={hover === i ? 0.9 : 0.4}
            />
          ))}

          {/* the 7-day average, with a surface-coloured halo so it stays readable over the columns */}
          <path d={linePoints} fill="none" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: 'var(--surface)' }} opacity="0.85" />
          <path d={linePoints} fill="none" stroke={AVERAGE_COLOR} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

          {active && (
            <circle cx={xCenter(hover)} cy={y(average[hover])} r="5" fill={AVERAGE_COLOR} style={{ stroke: 'var(--surface)' }} strokeWidth="2.5" />
          )}

          {/* invisible layer that catches the pointer, much wider than a column */}
          <rect
            x={margin.left}
            y={0}
            width={innerW}
            height={height - margin.bottom + 8}
            fill="transparent"
            onPointerMove={(e) => setHover(indexFromEvent(e))}
            onPointerDown={(e) => setHover(indexFromEvent(e))}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {!active && (
          <p
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-medium leading-none text-gray-600"
            style={{ left: peakLeft, top: Math.max(0, y(data[peakIndex].sales) - 22) }}
          >
            Best day {compactMoney(data[peakIndex].sales)}
          </p>
        )}

        {active && (
          <div
            className="pointer-events-none absolute z-10 w-52 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs shadow-lg"
            style={{ left: tipLeft, top: 0 }}
          >
            <p className="mb-1.5 font-semibold text-gray-900">{longDay(active.date)}</p>
            <p className="flex items-center justify-between gap-2 text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: COLUMN_COLOR, opacity: 0.6 }} />
                Sales
              </span>
              <span className="tabular font-semibold text-gray-900">{formatMoney(active.sales)}</span>
            </p>
            <p className="mt-0.5 flex items-center justify-between gap-2 text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-2 rounded-full" style={{ background: AVERAGE_COLOR }} />
                7-day average
              </span>
              <span className="tabular font-semibold text-gray-900">{formatMoney(Math.round(average[hover]))}</span>
            </p>
          </div>
        )}
      </div>

      {/* the same numbers as a table, for anyone who cannot use the chart */}
      <details className="mt-2 text-xs text-gray-500">
        <summary className="cursor-pointer select-none hover:text-gray-700">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-gray-200">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Day</th>
                <th className="px-3 py-1.5 text-right font-medium">Sales</th>
                <th className="px-3 py-1.5 text-right font-medium">7-day average</th>
              </tr>
            </thead>
            <tbody>
              {data
                .map((row, i) => ({ row, avg: average[i] }))
                .reverse()
                .map(({ row, avg }) => (
                  <tr key={String(row.date)} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{longDay(row.date)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-800">{formatMoney(row.sales)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-800">{formatMoney(Math.round(avg))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function ShowStat({ icon, tint = 'teal', label, value, note, noteTone }) {
  const t = TINTS[tint];
  const noteColor = noteTone === 'up' ? 'text-green-600' : noteTone === 'down' ? 'text-red-600' : 'text-gray-400';
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <span
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl ${t.glow}`}
        aria-hidden="true"
      />
      <span className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${t.chip}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="relative mt-4 text-sm text-gray-500">{label}</p>
      <p className="tabular relative mt-1 break-words text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{value}</p>
      {note && <p className={`relative mt-1 text-xs ${noteColor}`}>{note}</p>}
    </div>
  );
}

function Kpi({ label, value, note }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="tabular mt-1 truncate text-lg font-semibold text-gray-900">{value}</p>
      {note && <p className="mt-0.5 truncate text-xs text-gray-400">{note}</p>}
    </div>
  );
}

function ShowPanel({ title, note, children }) {
  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-gray-400">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function AdminSalesStockDemoPage() {
  const [days, setDays] = useState(30);
  const [present, setPresent] = useState(false);
  const data = useMemo(() => buildDemo(days), [days]);

  // Esc leaves presentation mode
  useEffect(() => {
    if (!present) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPresent(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present]);

  const daily = useMemo(() => data.byDay.map((d) => ({ date: d.date, sales: d.total })), [data]);

  const weekdays = useMemo(() => {
    const totals = new Map();
    for (const d of data.byDay) {
      const wd = d.date.getDay();
      totals.set(wd, (totals.get(wd) || 0) + d.total);
    }
    return WEEKDAYS.map((w) => ({ label: w.label, value: totals.get(w.day) || 0 }));
  }, [data]);

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Period">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => setDays(r.days)}
            aria-pressed={days === r.days}
            className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
              days === r.days ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Last {r.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setPresent(true)} className={secondaryButtonClass}>
        <Icon name="eye" className="h-4 w-4" />
        Presentation mode
      </button>
    </div>
  );

  const s = data.sales;
  const stock = data.stock;
  const change = s.previousRevenue > 0 ? ((s.revenue - s.previousRevenue) / s.previousRevenue) * 100 : null;
  const averageSale = s.count > 0 ? s.revenue / s.count : 0;

  return (
    <div>
      {/* Presentation mode: the admin sidebar and top bar show your own name and email, so they are hidden */}
      {present && (
        <>
          <style>{`
            aside, header { display: none !important; }
            .lg\\:pl-60 { padding-left: 0 !important; }
          `}</style>
          <button
            type="button"
            onClick={() => setPresent(false)}
            className="fixed right-4 top-4 z-50 rounded-full bg-gray-900/85 px-3.5 py-1.5 text-xs font-medium text-white opacity-0 transition hover:opacity-100 focus:opacity-100"
          >
            Exit presentation mode (Esc)
          </button>
        </>
      )}

      <PageHeader title="Sales & Stock" subtitle="Every sale recorded and every item on the shelves, in one place." action={controls} />


      <div className="space-y-4">
        <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <ShowStat
            icon="sales"
            tint="green"
            label={`Sales, last ${data.days} days`}
            value={<AnimatedNumber value={s.revenue} format={(n) => formatMoney(Math.round(n))} />}
            note={
              change == null
                ? plural(s.count, 'sale')
                : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}% vs the ${data.days} days before`
            }
            noteTone={change == null ? undefined : change >= 0 ? 'up' : 'down'}
          />
          <ShowStat
            icon="sparkle"
            tint="teal"
            label="Sales recorded"
            value={<AnimatedNumber value={s.count} />}
            note={`${s.units.toLocaleString()} units sold · avg ${formatMoney(Math.round(averageSale))}`}
          />
          <ShowStat
            icon="stock"
            tint="violet"
            label="Total stock"
            value={<AnimatedNumber value={stock.units} />}
            note={`units across ${plural(stock.products, 'product')}`}
          />
          <ShowStat
            icon="alert"
            tint="amber"
            label="Stock value"
            value={<AnimatedNumber value={stock.value} format={(n) => formatMoney(Math.round(n))} />}
            note={stock.low + stock.out > 0 ? `${stock.low + stock.out} products need restocking` : 'at selling price · all well stocked'}
          />
        </div>

        <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi label="Customers served" value={s.customers.toLocaleString()} note={`last ${data.days} days`} />
          <Kpi label="Units sold" value={s.units.toLocaleString()} note={`last ${data.days} days`} />
          <Kpi label="Collected" value={formatMoney(s.collected)} note="money received" />
          <Kpi label="Still owed" value={formatMoney(s.owed)} note="by customers" />
        </div>

        <ShowPanel title="Sales trend" note={`Money in each day over the last ${data.days} days, with the 7-day average`}>
          <SalesChart data={daily} />
        </ShowPanel>

        {/* the latest sales, and what is on the shelves, side by side */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ShowPanel title="Recorded sales" note="The latest sales, newest first">
            <ul className="divide-y divide-gray-100">
              {data.recent.map((sale) => (
                <li key={sale.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Icon name="products" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{sale.product}</p>
                    <p className="truncate text-xs text-gray-400">
                      {sale.quantity} × {formatMoney(sale.unitPrice)} · {timeAgo(sale.date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-gray-900">{formatMoney(sale.total)}</p>
                    <StatusBadge status={sale.status} />
                  </div>
                </li>
              ))}
            </ul>
          </ShowPanel>

          <ShowPanel title="Stock on hand" note="Units on the shelves right now, by category">
            <BarList
              items={stock.categories.map((c) => ({
                label: c.label,
                value: c.units,
                display: `${c.units.toLocaleString()} units`,
                sub: plural(c.products, 'product'),
              }))}
            />
            <div className="mt-5 border-t border-gray-100 pt-4">
              <SegmentBar
                segments={[
                  { label: 'In stock', value: stock.ok, color: STATUS_COLORS.ok, display: plural(stock.ok, 'product') },
                  { label: 'Low stock', value: stock.low, color: STATUS_COLORS.low, display: plural(stock.low, 'product') },
                  { label: 'Out of stock', value: stock.out, color: STATUS_COLORS.out, display: plural(stock.out, 'product') },
                ]}
              />
            </div>
          </ShowPanel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ShowPanel title="Best-selling categories" note={`Most units sold in the last ${data.days} days`}>
            <BarList
              items={data.soldCategories.map((c) => ({
                label: c.label,
                value: c.units,
                display: `${c.units.toLocaleString()} sold`,
                sub: formatMoney(c.total),
              }))}
            />
          </ShowPanel>

          <ShowPanel title="Busiest days" note={`Sales by day of the week, last ${data.days} days`}>
            <BarList items={weekdays.map((w) => ({ label: w.label, value: w.value, display: formatMoney(w.value) }))} />
          </ShowPanel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ShowPanel title="Payments" note="Collected vs still owed, and how customers paid">
            <SegmentBar
              segments={[
                { label: 'Collected', value: s.collected, color: STATUS_COLORS.ok, display: formatMoney(s.collected) },
                { label: 'Still owed', value: s.owed, color: STATUS_COLORS.low, display: formatMoney(s.owed) },
              ]}
            />
            <div className="mt-5 border-t border-gray-100 pt-4">
              <BarList items={data.methods.map((m) => ({ label: m.label, value: m.total, display: formatMoney(m.total) }))} />
            </div>
          </ShowPanel>

          <ShowPanel title="How long stock will last" note={`By category, at the pace of the last ${data.days} days`}>
            <ul className="divide-y divide-gray-100">
              {data.cover.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-gray-800">{row.label}</span>
                    <span className="block text-xs text-gray-400">
                      {row.perDay >= 1 ? `${row.perDay.toFixed(1)} sold a day` : `${(row.perDay * 7).toFixed(1)} sold a week`}
                      {` · ${row.units.toLocaleString()} in stock`}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 text-gray-600">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: coverColor(row) }} />
                    {coverText(row)}
                  </span>
                </li>
              ))}
            </ul>
          </ShowPanel>
        </div>
      </div>
    </div>
  );
}
