'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icons';
import { BrandMark } from '@/components/Navbar';

// The phone always looks the same (light screen), even when the visitor is using dark mode, so it carries its own colours.
const LIGHT = {
  '--surface': '#ffffff',
  '--primary-ink': '#0f766e',
  '--shadow-rgb': '15 23 42',
  '--color-gray-50': '#f8fafc',
  '--color-gray-100': '#f1f5f9',
  '--color-gray-200': '#e2e8f0',
  '--color-gray-400': '#94a3b8',
  '--color-gray-500': '#64748b',
  '--color-gray-600': '#475569',
  '--color-gray-900': '#0f172a',
  '--color-green-50': '#f0fdf4',
  '--color-green-700': '#15803d',
  '--color-amber-50': '#fffbeb',
  '--color-amber-700': '#b45309',
  '--color-teal-50': '#f0fdfa',
  '--color-teal-700': '#0f766e',
};

const SALES = [
  { who: 'Adaeze O.', what: 'Samsung A15', amount: 210000 },
  { who: 'Walk-in', what: 'Phone charger x3', amount: 13500 },
  { who: 'Chuka M.', what: 'Laptop bag', amount: 25000 },
];

// What the little story shows, one after the other:
// 0 offline with two sales saved, 1 a third sale is saved, 2 the internet is back and they send, 3 all sent.
const PHASE_MS = [2600, 2600, 2000, 3400];

const naira = (n) => `₦${n.toLocaleString('en-NG')}`;

function Status({ phase }) {
  if (phase < 2) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        <Icon name="wifiOff" className="h-3.5 w-3.5" /> Offline
      </span>
    );
  }
  if (phase === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-700/30 border-t-teal-700" /> Syncing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-700" /> Online
    </span>
  );
}

function Badge({ phase }) {
  if (phase < 2) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Saved on phone</span>;
  if (phase === 2) return <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">Sending…</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
      <Icon name="check" className="h-3 w-3" strokeWidth={2.6} /> Synced
    </span>
  );
}

// A small animated phone for the top of the home page: a sale is recorded with no signal, then sends itself.
export default function HeroPhone() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase(1); // hold still for people who ask for less motion
      return undefined;
    }
    let current = 0;
    let timer;
    const next = () => {
      timer = setTimeout(() => {
        current = (current + 1) % PHASE_MS.length;
        setPhase(current);
        next();
      }, PHASE_MS[current]);
    };
    next();
    return () => clearTimeout(timer);
  }, []);

  const shown = phase === 0 ? 2 : 3;
  const total = SALES.slice(0, shown).reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="relative mx-auto w-full max-w-[19rem]" aria-hidden="true">
      {/* glow behind the phone */}
      <div className="absolute -inset-8 -z-10 rounded-full bg-[#2dd4bf]/25 blur-3xl" />

      <div className="rounded-[2.4rem] bg-[#0a1f1d] p-[7px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/15">
        <div className="relative overflow-hidden rounded-[1.95rem] bg-gray-50" style={LIGHT}>
          <div className="mx-auto mt-2 h-5 w-20 rounded-full bg-[#0a1f1d]" />

          <div className="px-4 pb-4 pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <BrandMark className="h-6 w-6" /> LogBase
              </span>
              <Status phase={phase} />
            </div>

            <div className="mt-4 rounded-2xl bg-[#115e59] p-4 text-white">
              <p className="text-[11px] text-white/70">Sales today</p>
              <p className="tabular mt-0.5 text-2xl font-semibold tracking-tight">{naira(total)}</p>
              <p className="mt-1 text-[11px] text-white/70">{shown} sales recorded</p>
            </div>

            <div className="mt-3 h-[10.4rem] space-y-2">
              {SALES.slice(0, shown).map((s, i) => (
                <div
                  key={s.who}
                  className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 ${i === 2 ? 'animate-fade-up' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-gray-900">{s.what}</span>
                    <span className="block text-[10px] text-gray-500">{s.who} · {naira(s.amount)}</span>
                  </span>
                  <Badge phase={phase} />
                </div>
              ))}
            </div>

            <div
              className={`mt-3 rounded-xl px-3 py-2.5 text-center text-[11px] font-medium transition-colors duration-500 ${
                phase < 2 ? 'bg-amber-50 text-amber-700' : phase === 2 ? 'bg-teal-50 text-teal-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {phase < 2 ? `${shown} sales saved on this phone` : phase === 2 ? 'Sending to your account…' : 'All synced. Nothing counted twice.'}
            </div>
          </div>
        </div>
      </div>

      {/* a small note that floats beside the phone */}
      <div
        className="absolute -right-12 top-24 hidden items-center gap-2 rounded-xl bg-[#ffffff] px-3 py-2 text-xs shadow-xl sm:flex"
        style={LIGHT}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            phase < 2 ? 'bg-amber-50 text-amber-700' : phase === 2 ? 'bg-teal-50 text-teal-700' : 'bg-green-50 text-green-700'
          }`}
        >
          <Icon name={phase < 2 ? 'wifiOff' : phase === 2 ? 'bolt' : 'check'} className="h-4 w-4" />
        </span>
        <span>
          <span className="block font-semibold text-gray-900">{phase < 2 ? 'No network' : phase === 2 ? 'Back online' : 'All sent'}</span>
          <span className="block text-[10px] text-gray-500">{phase < 2 ? 'Still selling' : phase === 2 ? 'Sending sales' : 'No double entry'}</span>
        </span>
      </div>
    </div>
  );
}
