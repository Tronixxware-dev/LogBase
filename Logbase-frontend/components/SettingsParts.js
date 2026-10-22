'use client';

// Building blocks for the Settings pages: the hub cards, a section card, and an on / off switch.

import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { cardClass } from '@/components/ui';

// A card on the Settings hub: coloured icon, title, one line about it, and an arrow
export function SettingsCard({ href, icon, title, description, tone = 'teal', badge = 0 }) {
  const chips = {
    teal: 'bg-teal-50 text-teal-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700',
    green: 'bg-green-50 text-green-700',
  };
  return (
    <Link
      href={href}
      className={`${cardClass} group relative flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${chips[tone] || chips.teal}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-gray-900">{title}</span>
          {badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">{badge}</span>}
        </span>
        <span className="mt-1 block text-sm leading-snug text-gray-500">{description}</span>
      </span>
      <Icon name="arrowRight" className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

// A card with a heading, used to group the fields of a settings page
export function SettingsSection({ title, description, icon, children, className = '' }) {
  return (
    <section className={`${cardClass} mb-6 p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// An on / off switch with its words beside it
export function Toggle({ checked, onChange, label, hint, disabled = false, id }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-snug text-gray-500">{hint}</p>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-gray-300'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

// "Saved" feedback line under a form
export function SavedNote({ show, children = 'Saved' }) {
  if (!show) return null;
  return (
    <p role="status" className="animate-pop-in inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
      <Icon name="check" className="h-4 w-4" />
      {children}
    </p>
  );
}
