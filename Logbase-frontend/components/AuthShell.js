'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { BrandMark } from '@/components/Navbar';
import { ThemeIconButton } from '@/components/ThemeToggle';

const FEATURES = [
  { icon: 'wifiOff', title: 'Keeps selling offline', text: 'Record sales with no signal. They send themselves when you are back online.' },
  { icon: 'stock', title: 'Every unit accounted for', text: 'Purchases, sales, returns and stock changes, all in one place.' },
  { icon: 'shield', title: 'You decide who sees what', text: 'Give each staff only the access they need.' },
];

// A decorative preview of the dashboard for the brand panel.
function PreviewCards() {
  return (
    <div className="relative mx-auto mt-10 h-56 w-full max-w-sm" aria-hidden="true">
      <div className="animate-float-slow absolute left-0 top-0 w-64 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-md">
        <p className="text-xs text-teal-50/80">Today&apos;s sales</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-white">₦148,500</p>
        <svg viewBox="0 0 200 56" className="mt-3 h-12 w-full" fill="none">
          <defs>
            <linearGradient id="auth-spark" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 44 L24 38 L48 42 L72 26 L96 30 L120 16 L148 22 L172 8 L200 12 L200 56 L0 56Z" fill="url(#auth-spark)" />
          <path d="M0 44 L24 38 L48 42 L72 26 L96 30 L120 16 L148 22 L172 8 L200 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div
        className="animate-float-slow absolute bottom-0 right-0 w-48 rounded-2xl border border-white/20 bg-white/15 p-4 shadow-xl backdrop-blur-md"
        style={{ animationDelay: '-4s' }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/90 text-amber-900">
            <Icon name="alert" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-teal-50/80">Low stock</p>
            <p className="text-sm font-semibold text-white">3 products</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// The whole page around the sign-in forms: a brand panel on the left (large screens) and the form on the right.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* brand panel */}
      <aside className="brand-gradient relative hidden overflow-hidden px-12 py-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse at 30% 20%, #000, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 30% 20%, #000, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <BrandMark className="h-10 w-10 rounded-xl ring-1 ring-white/40" />
          <span className="text-xl font-semibold tracking-tight">LogBase</span>
        </div>

        <div className="relative my-auto py-10">
          <h2 className="max-w-md text-4xl font-semibold leading-[1.1] tracking-tight">
            Know what you sold, what is left, and who owes you.
          </h2>
          <p className="mt-4 max-w-md text-base text-teal-50/85">
            One simple place to run your shop&apos;s stock, sales and customers, from your phone or your counter.
          </p>

          <ul className="mt-8 max-w-md space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-sm text-teal-50/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <PreviewCards />
        </div>
      </aside>

      {/* form */}
      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 lg:invisible" aria-label="LogBase">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight text-gray-900">LogBase</span>
          </Link>
          <ThemeIconButton />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="animate-fade-up w-full max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
            {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <p className="mt-8 text-center text-sm text-gray-500">{footer}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

// A labelled field with an icon inside it. Passwords get a show / hide button.
export function AuthField({ label, icon, type = 'text', right, ...props }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {right}
      </div>
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
          />
        )}
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          {...props}
          className={`h-12 w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 hover:border-gray-400 ${
            icon ? 'pl-11' : 'pl-4'
          } ${isPassword ? 'pr-12' : 'pr-4'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Icon name={shown ? 'eyeOff' : 'eye'} className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthButton({ loading, children, loadingText }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {loading ? loadingText : children}
    </button>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="animate-pop-in mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function AuthNotice({ tone = 'green', children }) {
  const tones = {
    green: 'border-green-200 bg-green-50 text-green-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return (
    <div role="status" className={`animate-pop-in mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <Icon name={tone === 'green' ? 'check' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
