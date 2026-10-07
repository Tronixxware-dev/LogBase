'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatMoney } from '@/lib/format';

// Colours used by the Overview charts. Sales use the brand teal, purchases use orange;
// the pair was checked for colour-blind safety, and every series is also named in a legend.
export const SERIES_SALES = '#0d9488';
export const SERIES_PURCHASES = '#eb6834';
export const STATUS_COLORS = { ok: '#16a34a', low: '#d97706', out: '#dc2626' };

// ₦1.2k, ₦3.4M … for axis labels where full numbers would not fit.
export function compactMoney(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `₦${+(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `₦${+(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `₦${+(n / 1e3).toFixed(1)}k`;
  return `₦${Math.round(n)}`;
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * p;
}

function shortDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function longDate(date) {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}


// A smooth curve through the points that never swings above or below them (monotone cubic).
function smoothPath(points) {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push((points[i + 1][1] - points[i][1]) / (dx[i] || 1));
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
    } else {
      const a = tangent[i] / slope[i];
      const b = tangent[i + 1] / slope[i];
      const h = Math.hypot(a, b);
      if (h > 3) {
        tangent[i] = (3 * a * slope[i]) / h;
        tangent[i + 1] = (3 * b * slope[i]) / h;
      }
    }
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const x1 = points[i][0] + dx[i] / 3;
    const y1 = points[i][1] + (tangent[i] * dx[i]) / 3;
    const x2 = points[i + 1][0] - dx[i] / 3;
    const y2 = points[i + 1][1] - (tangent[i + 1] * dx[i]) / 3;
    d += ` C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${points[i + 1][0].toFixed(1)},${points[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* Line / area chart over days, with a hover tooltip                   */
/* ------------------------------------------------------------------ */

// data:   [{ date, <seriesKey>: number, ... }]  one row per day
// series: [{ key, label, color }]               the first one also gets a soft area fill
export function TrendChart({ data, series, height = 240 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);
  const gradientId = `area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // draw at the real pixel width so the text stays readable on phones
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.max(260, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = data.length;
  const margin = { top: 12, right: 14, bottom: 26, left: 54 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxValue = Math.max(0, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)));
  const hasData = maxValue > 0;
  const step = hasData ? niceStep(maxValue / 4) : 250;
  const top = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);

  const x = (i) => margin.left + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v) => margin.top + innerH * (1 - v / top);

  const pathFor = (key) => smoothPath(data.map((row, i) => [x(i), y(Number(row[key]) || 0)]));

  const areaFor = (key) =>
    `${pathFor(key)} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  // about 6 evenly spaced date labels
  const labelEvery = Math.max(1, Math.round(n / 6));
  const labelIdx = data.map((_, i) => i).filter((i) => i % labelEvery === 0 && i <= n - 1 - Math.floor(labelEvery / 2));
  if (n > 1 && !labelIdx.includes(n - 1) && n - 1 - labelIdx[labelIdx.length - 1] >= labelEvery) labelIdx.push(n - 1);

  function indexFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const raw = n <= 1 ? 0 : ((px - margin.left) / innerW) * (n - 1);
    return Math.min(n - 1, Math.max(0, Math.round(raw)));
  }

  const active = hover != null ? data[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(x(hover), 90), width - 90) : 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div ref={wrapRef} className="relative" style={{ height }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${series.map((s) => s.label).join(' and ')} per day`}
          className="block select-none"
        >
          {/* grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-gray-200"
                strokeWidth="1"
                strokeDasharray={t === 0 ? undefined : '4 5'}
              />
              <text x={margin.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-gray-400">
                {compactMoney(t)}
              </text>
            </g>
          ))}

          {/* x labels */}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" className="fill-gray-400">
              {shortDate(data[i].date)}
            </text>
          ))}

          {/* soft area under the first series, then every line */}
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={series[0].color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={series[0].color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {hasData && <path d={areaFor(series[0].key)} fill={`url(#${gradientId})`} />}
          {series.map((s) => (
            <path
              key={s.key}
              d={pathFor(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* crosshair + points for the day under the pointer */}
          {active && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={margin.top} y2={y(0)} className="stroke-gray-400" strokeWidth="1" strokeDasharray="3 3" />
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={x(hover)}
                  cy={y(Number(active[s.key]) || 0)}
                  r="5"
                  fill={s.color}
                  style={{ stroke: 'var(--surface)' }}
                  strokeWidth="2.5"
                />
              ))}
            </g>
          )}

          {/* invisible layer that catches the pointer, wider than any mark */}
          <rect
            x={margin.left}
            y={margin.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={(e) => setHover(indexFromEvent(e))}
            onPointerDown={(e) => setHover(indexFromEvent(e))}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-sm text-gray-400">
            Nothing recorded in this period yet
          </div>
        )}

        {active && (
          <div
            className="pointer-events-none absolute z-10 w-48 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs shadow-lg"
            style={{ left: tipLeft, top: 0 }}
          >
            <p className="mb-1.5 font-semibold text-gray-900">{longDate(active.date)}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-2 text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular font-semibold text-gray-900">{formatMoney(active[s.key])}</span>
              </p>
            ))}
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
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-1.5 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((row) => (
                <tr key={String(row.date)} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">{longDate(row.date)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right text-gray-800">
                      {formatMoney(row[s.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bars: one row per item, value written at the end         */
/* ------------------------------------------------------------------ */

// items: [{ label, value, display, sub }]   value drives the bar length, display is the text shown
export function BarList({ items, color = SERIES_SALES, empty = 'Nothing to show yet' }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-gray-400">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} title={`${item.label}: ${item.display}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-gray-700">{item.label}</span>
            <span className="tabular shrink-0 font-semibold text-gray-900">{item.display}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div
              className="animate-grow-x h-2.5 rounded-full"
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, #fff), ${color})`,
              }}
            />
          </div>
          {item.sub && <p className="mt-0.5 text-xs text-gray-400">{item.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* One stacked bar split into named parts, with a legend underneath    */
/* ------------------------------------------------------------------ */

// segments: [{ label, value, color, display }]   zero-value parts are drawn only in the legend
export function SegmentBar({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const parts = segments.filter((seg) => seg.value > 0);

  return (
    <div>
      <div className="flex h-3.5 w-full gap-1 overflow-hidden rounded-full bg-gray-100">
        {total > 0 &&
          parts.map((seg) => (
            <div
              key={seg.label}
              title={`${seg.label}: ${seg.display}`}
              className="animate-grow-x rounded-full"
              style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
            />
          ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 text-gray-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
              {seg.label}
            </span>
            <span className="tabular font-semibold text-gray-900">{seg.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
