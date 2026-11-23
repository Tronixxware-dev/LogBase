'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { BrandMark } from '@/components/Navbar';
import { ThemeIconButton } from '@/components/ThemeToggle';
import { Icon } from '@/components/Icons';
import Avatar from '@/components/Avatar';
import OfflineStatus from '@/components/OfflineStatus';
import { LogoLoader } from '@/components/LogoLoader';
import { AgentDataProvider } from '@/components/agent/AgentData';

// The Sales Agent's menu. A phone gets a bar at the bottom (the thumb reaches it); a larger screen gets the same links along the top.
const NAV = [
  { href: '/agent', label: 'Home', icon: 'overview', exact: true },
  { href: '/agent/shops', label: 'Shops', icon: 'store' },
  { href: '/agent/mail', label: 'Mail', icon: 'mail' },
  { href: '/agent/money', label: 'Money', icon: 'wallet' },
  { href: '/agent/log', label: 'Daily log', icon: 'note', desktopOnly: true },
  { href: '/agent/profile', label: 'Profile', icon: 'user' },
];

const isActive = (pathname, l) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`));

// The frame around the Sales Agent pages: a slim top bar, the page, and the menu.
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

  const current = NAV.find((l) => isActive(pathname, l));

  return (
    <div className="min-h-screen print:bg-white">
      <header className="glass sticky top-0 z-30 border-b border-gray-200 print:hidden" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/agent" className="flex shrink-0 items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="hidden text-sm font-semibold text-gray-900 lg:block">
              LogBase <span className="font-medium text-primary">Sales Agent</span>
            </span>
          </Link>

          {/* phone: the name of the page */}
          <p className="min-w-0 truncate text-base font-semibold text-gray-900 md:hidden">{current ? current.label : 'Sales Agent'}</p>

          {/* larger screens: the menu along the top */}
          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Sales Agent menu">
            {NAV.map((l) => {
              const active = isActive(pathname, l);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <Icon name={l.icon} className="h-[18px] w-[18px]" />
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {!agentOnly && (
              <Link href="/dashboard" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:block">
                My business
              </Link>
            )}
            <ThemeIconButton />
            <Link href="/agent/profile" aria-label="Your profile" className="rounded-full">
              <Avatar name={user.name} photoUrl={user.photoUrl} size="sm" tone="primary" />
            </Link>
            <button type="button" onClick={logout} className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:block">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-28 sm:px-6 sm:py-8 md:pb-10">
        <OfflineStatus />
        <AgentDataProvider>{children}</AgentDataProvider>
      </main>

      {/* phone: the menu at the bottom of the screen */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 md:hidden print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Sales Agent menu">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.filter((l) => !l.desktopOnly).map((l) => {
            const active = isActive(pathname, l);
            return (
              <li key={l.href}>
                <Link href={l.href} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-1 px-1 pb-2 pt-2.5">
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? 'bg-primary/15 text-primary' : 'text-gray-500'}`}>
                    <Icon name={l.icon} className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.7} />
                  </span>
                  <span className={`text-[11px] font-medium leading-none ${active ? 'text-primary' : 'text-gray-500'}`}>{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
