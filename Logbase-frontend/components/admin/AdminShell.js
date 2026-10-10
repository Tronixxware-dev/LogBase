'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { Icon } from '@/components/Icons';
import { BrandMark } from '@/components/Navbar';
import { ThemeIconButton } from '@/components/ThemeToggle';
import Avatar from '@/components/Avatar';

const LINKS = [
  { href: '/admin', label: 'Overview', icon: 'overview', exact: true },
  { href: '/admin/businesses', label: 'Businesses', icon: 'store' },
  { href: '/admin/payments', label: 'Payments', icon: 'billing' },
  { href: '/admin/activity', label: 'Activity', icon: 'activity' },
  { href: '/admin/email', label: 'Email', icon: 'mail' },
  { href: '/admin/log', label: 'Admin log', icon: 'shield' },
];

function isActive(pathname, link) {
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

// The frame around every /admin page: a side menu on large screens, a scrolling tab bar on phones.
// Only the LogBase super admin gets in. (The server checks this on every call as well; this just keeps everyone
// else from seeing an empty panel.)
export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();
  const allowed = Boolean(user && user.isSuperAdmin);

  useEffect(() => {
    if (user && !user.isSuperAdmin) router.replace('/dashboard');
  }, [user, router]);

  if (!allowed) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      {/* large screens: side menu */}
      <aside className="glass fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-gray-200 lg:flex">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <BrandMark />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">LogBase</span>
            <span className="mt-0.5 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Admin panel</span>
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 pt-1">
          {LINKS.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active ? 'bg-primary/10 font-medium text-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon name={link.icon} className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-gray-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-gray-200 p-3">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900">
            <Icon name="arrowRight" className="h-5 w-5 rotate-180 text-gray-400" />
            My own dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-2">
            <Avatar name={user.name} photoUrl={user.photoUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">{user.name}</span>
              <span className="block truncate text-xs text-gray-500">{user.email}</span>
            </span>
            <button onClick={logout} aria-label="Log out" title="Log out" className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600">
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* top bar (phones and tablets show the menu as tabs) */}
        <header className="glass sticky top-0 z-30 border-b border-gray-200">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:hidden">
            <BrandMark className="h-8 w-8" />
            <span className="text-base font-semibold text-gray-900">LogBase</span>
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Admin</span>
            <div className="ml-auto flex items-center gap-1.5">
              <Link href="/dashboard" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-xs">
                My dashboard
              </Link>
              <ThemeIconButton />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="Admin menu">
            {LINKS.map((link) => {
              const active = isActive(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
                    active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden h-14 items-center justify-end gap-2 px-6 lg:flex">
            <ThemeIconButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
