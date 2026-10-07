'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/api';
import { BrandMark } from '@/components/Navbar';
import { ThemeIconButton } from '@/components/ThemeToggle';
import { Icon } from '@/components/Icons';

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

// The bar across the top of every public page. Someone who is already signed in sees "Open dashboard".
export default function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
  }, []);

  return (
    <header className="glass sticky top-0 z-40 border-b border-gray-200">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="LogBase home">
          <BrandMark className="h-9 w-9" />
          <span className="text-lg font-semibold tracking-tight text-gray-900">LogBase</span>
        </Link>

        <nav className="ml-8 hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeIconButton />
          {signedIn ? (
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark">
              Open dashboard
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:block">
                Log in
              </Link>
              <Link href="/signup" className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark">
                Start free
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs md:hidden"
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="animate-fade-in border-t border-gray-200 px-4 py-3 md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm text-gray-700 hover:bg-gray-100">
              {l.label}
            </a>
          ))}
          {!signedIn && (
            <Link href="/login" className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
