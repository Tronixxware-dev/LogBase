'use client';

// The filter bar used on every list in the app: a search box, a row of small labelled drop-downs, and a "Filters" button
// that opens the rarer options (dates, people, payment...). It shows how many filters are on and has one "Clear all".
//
//   <FilterBar
//     search={{ value, onChange, placeholder: 'Search sales' }}
//     filters={[{ key: 'status', label: 'Status', value, onChange, options: [{ value: 'all', label: 'All' }, ...] }]}
//     panel={<DateRange ... />} panelCount={1}
//     right={<ViewToggle />}
//   />
//
// A filter is "on" when its value is not the first option's value (or its `defaultValue`, when it has one). A filter with `advanced: true` lives in the Filters panel.

import { useState } from 'react';
import { Icon } from '@/components/Icons';
import { cardClass, inputClass } from '@/components/ui';

const asOption = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

// One small labelled drop-down
export function FilterSelect({ label, value, onChange, options, className = '' }) {
  const list = (options || []).map(asOption);
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`${inputClass} !py-2 sm:!w-auto sm:min-w-36`}
      >
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// "From" and "To" days, for the Filters panel
export function DateRange({ from, to, onFrom, onTo, label = 'Date' }) {
  return (
    <>
      <label className="block min-w-0">
        <span className="mb-1 block text-xs font-medium text-gray-500">{label} from</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} aria-label={`${label} from`} className={`${inputClass} !py-2`} />
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-xs font-medium text-gray-500">{label} to</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} aria-label={`${label} to`} className={`${inputClass} !py-2`} />
      </label>
    </>
  );
}

// Is a date inside the chosen days? (empty "from" / "to" mean no limit). Days are the person's own local days.
export function inDateRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && t > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

// Drop-down options built from what the records actually hold: [{ value: 'all', label: allLabel }, ...each different value]
export function optionsFrom(rows, get, allLabel) {
  return [
    { value: 'all', label: allLabel },
    ...Array.from(new Set(rows.map(get).filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((v) => ({ value: v, label: String(v).charAt(0).toUpperCase() + String(v).slice(1) })),
  ];
}

// The store drop-down, only when the business has more than one store. Returns a filter for <FilterBar filters={...}>.
export function storeFilter({ shops, multiple, value, onChange, defaultValue }) {
  if (!multiple) return null;
  return {
    key: 'store',
    label: 'Store',
    value,
    onChange,
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    options: [{ value: 'all', label: 'All stores' }, ...shops.map((s) => ({ value: s._id, label: s.name }))],
  };
}

export default function FilterBar({ search, filters = [], panel, panelCount = 0, onClear, right, className = 'mb-4' }) {
  const [open, setOpen] = useState(false);
  const list = filters.filter(Boolean);
  const inline = list.filter((f) => !f.advanced);
  const advanced = list.filter((f) => f.advanced);
  // what a filter is set to when it is "off": its `defaultValue`, or else the first option
  const offValue = (f) => (f.defaultValue !== undefined ? f.defaultValue : asOption((f.options || [])[0] || { value: '' }).value);
  const isOn = (f) => f.value !== offValue(f);
  const advancedOn = advanced.filter(isOn).length + (Number(panelCount) || 0);
  const inlineOn = inline.filter(isOn).length;
  const searching = Boolean(search && String(search.value || '').trim());
  const anyOn = advancedOn > 0 || inlineOn > 0 || searching;
  const hasPanel = advanced.length > 0 || Boolean(panel);

  function clearAll() {
    for (const f of list) f.onChange(offValue(f));
    if (search) search.onChange('');
    if (onClear) onClear();
  }

  const select = (f) => <FilterSelect key={f.key || f.label} label={f.label} value={f.value} onChange={f.onChange} options={f.options} />;

  return (
    <div className={className}>
      {search && (
        <div className="relative mb-3 w-full sm:w-96">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder || 'Search'}
            aria-label={search.label || search.placeholder || 'Search'}
            className={`${inputClass} !pl-10`}
          />
        </div>
      )}

      {(inline.length > 0 || hasPanel || right || anyOn) && (
        <div className="flex flex-wrap items-end gap-3">
          {inline.length > 0 && <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:flex sm:flex-none sm:flex-wrap">{inline.map(select)}</div>}
          {hasPanel && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 hover:shadow-sm active:scale-[0.98]"
            >
              <Icon name="adjust" className="h-4 w-4" />
              Filters
              {advancedOn > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">{advancedOn}</span>
              )}
            </button>
          )}
          {anyOn && (
            <button type="button" onClick={clearAll} className="py-2 text-sm font-medium text-primary hover:underline">
              Clear all
            </button>
          )}
          {right && <div className="flex flex-wrap items-center gap-3 sm:ml-auto">{right}</div>}
        </div>
      )}

      {hasPanel && open && (
        <div className={`${cardClass} animate-fade-up mt-3 grid grid-cols-1 gap-3 p-4 min-[420px]:grid-cols-2 lg:grid-cols-4`}>
          {advanced.map(select)}
          {panel}
        </div>
      )}
    </div>
  );
}
