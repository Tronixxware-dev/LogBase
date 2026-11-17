'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { BrandMark } from '@/components/Navbar';
import { ThemeIconButton } from '@/components/ThemeToggle';
import OfflineStatus from '@/components/OfflineStatus';
import { LogoLoader } from '@/components/LogoLoader';

const LINKS = [
  { href: '/agent', label: 'Home', exact: true },
  { href: '/agent/account', label: 'Account' },
];

// The frame around the Sales Agent pages: a slim top bar (logo, two links, sign out) and the page.
// Only someone who is a Sales Agent belongs here; anyone else goes to their own dashboard.
export default function AgentShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();
  const allowed = user.role === 'agent' || Boolean(user.isAgent);
  const agentOnly = user.role === 'agent';

  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  if (!allowed) return <LogoLoader fullscreen label="Opening LogBase…" />;

  return (
    <div className="min-h-screen print:bg-white">
      <header className="glass sticky top-0 z-30 border-b border-gray-200 print:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link href="/agent" className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="hidden text-sm font-semibold text-gray-900 sm:block">
              LogBase <span className="font-medium text-primary">Sales Agent</span>
            </span>
          </Link>
          <nav className="ml-2 flex items-center gap-1">
            {LINKS.map((l) => {
              const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {!agentOnly && (
              <Link href="/dashboard" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:block">
                My business
              </Link>
            )}
            <ThemeIconButton />
            <button type="button" onClick={logout} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <OfflineStatus />
        {children}
      </main>
    </div>
  );
}
