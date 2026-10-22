'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatLongDate, formatTime, greetingFor } from '@/lib/format';
import { Icon } from '@/components/Icons';

// The current time, refreshed every minute, so the greeting and the clock never go stale on a screen left open.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = setTimeout(tick, (60 - d.getSeconds()) * 1000 - d.getMilliseconds() + 50);
    };
    timer = setTimeout(tick, 0);
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}

// A button on the green banner. The first one is solid white, the others are see-through.
export function HeroLink({ href, solid, icon, children }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] ${
        solid ? 'bg-[#ffffff] text-[#0f766e] shadow-md hover:shadow-lg hover:brightness-95' : 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25'
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {children}
    </Link>
  );
}

// The green greeting banner at the top of the laundromat's Overview, like the one on a shop's Overview.
export default function LaundryHero({ name, message, children }) {
  const now = useNow();
  const greet = greetingFor(now);
  return (
    <section className="brand-gradient relative mb-6 overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg sm:px-8 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(110deg, #000, transparent 65%)',
          WebkitMaskImage: 'linear-gradient(110deg, #000, transparent 65%)',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal-50/85">
            <span aria-hidden="true">{greet.emoji}</span> {greet.text} · {formatLongDate(now)} · <span className="tabular">{formatTime(now)}</span>
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{`Welcome back, ${name}`}</h1>
          {message && <p className="mt-1.5 text-sm text-teal-50/85">{message}</p>}
        </div>
        <div className="flex flex-wrap gap-2.5">{children}</div>
      </div>
    </section>
  );
}
