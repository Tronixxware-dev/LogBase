'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import Avatar from '@/components/Avatar';
import { Icon } from '@/components/Icons';
import { ThemeSwitchRow } from '@/components/ThemeToggle';
import { dataLink, billingLink, teamLink, isActive, labelFor, visibleLinks } from '@/lib/nav';

// The LogBase mark: a rounded square with a gradient and a stacked "L".
export function BrandMark({ className = 'h-9 w-9' }) {
  return (
    <span className={`brand-gradient relative flex shrink-0 items-center justify-center rounded-xl shadow-md ${className}`}>
      <span className="absolute inset-0 rounded-xl bg-linear-to-b from-white/25 to-transparent" aria-hidden="true" />
      <svg viewBox="0 0 24 24" fill="none" className="relative h-[55%] w-[55%]" aria-hidden="true">
        <path d="M7 4.5v11.2a2 2 0 0 0 2 2H18" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.5 12h4.5" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function NavItem({ link, pathname, showsRecordItem, label, onNavigate }) {
  const active = isActive(pathname, link, showsRecordItem);
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
        active
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {active && (
        <span
          className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-linear-to-b from-teal-300 to-primary"
          aria-hidden="true"
        />
      )}
      <Icon
        name={link.icon}
        className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
          active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
        }`}
      />
      <span className="truncate">{label || link.label}</span>
    </Link>
  );
}

function businessNameOf(user) {
  const b = user?.business;
  return user?.businessName || (b && typeof b === 'object' && b.name) || 'LogBase';
}

function SidebarContent({ pathname, user, isOwner, can, logout, onNavigate }) {
  const { top: visibleTop, products: visibleProducts } = visibleLinks({ can, isOwner });
  const showsRecordItem = visibleTop.some((l) => l.label === 'Record sale');

  const sectionHasActive = visibleProducts.some((l) => isActive(pathname, l, showsRecordItem));
  const [open, setOpen] = useState(true);
  const showSection = open || sectionHasActive;
  const businessName = businessNameOf(user);

  return (
    <div className="flex h-full flex-col">
      {/* business / workspace block */}
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 px-5 pb-4 pt-5">
        <BrandMark />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-gray-900">{businessName}</span>
          <span className="block text-xs font-medium text-primary">LogBase</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6 pt-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-22px),transparent)]">
        {visibleTop.map((link) => (
          <NavItem
            key={`${link.href}-${link.label}`}
            link={link}
            label={labelFor(link, can)}
            pathname={pathname}
            showsRecordItem={showsRecordItem}
            onNavigate={onNavigate}
          />
        ))}

        {visibleProducts.length > 0 && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={showSection}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition hover:text-gray-600"
            >
              Products
              <Icon
                name="chevron"
                className={`h-4 w-4 transition-transform duration-200 ${showSection ? '' : '-rotate-90'}`}
              />
            </button>
            {showSection && (
              <div className="animate-fade-in mt-1 space-y-0.5">
                {visibleProducts.map((link) => (
                  <NavItem
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    showsRecordItem={showsRecordItem}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {isOwner && (
          <div className="space-y-0.5 pt-4">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Business</p>
            <NavItem link={teamLink} pathname={pathname} onNavigate={onNavigate} />
            <NavItem link={dataLink} pathname={pathname} onNavigate={onNavigate} />
            <NavItem link={billingLink} pathname={pathname} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      {/* signed-in user, theme and log out */}
      <div className="border-t border-gray-200 p-3">
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          aria-current={pathname === '/dashboard/profile' ? 'page' : undefined}
          title="Your profile"
          className={`brand-gradient group relative mb-1.5 flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 shadow-md transition hover:shadow-lg ${
            pathname === '/dashboard/profile' ? 'ring-2 ring-teal-300' : ''
          }`}
        >
          <span
            className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125"
            aria-hidden="true"
          />
          <Avatar name={user?.name} photoUrl={user?.photoUrl} tone="light" />
          <span className="relative min-w-0">
            <span className="block truncate text-sm font-medium text-white">{user?.name}</span>
            <span className="block truncate text-xs text-teal-50/90">
              {isOwner ? 'Administrator' : user?.jobTitle || 'Staff'}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <ThemeSwitchRow />
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="logout" className="h-5 w-5" />
            <span className="sr-only">Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Left sidebar on large screens; on phones the top bar opens the same menu as a drawer.
// (The top bar itself is in TopBar.js; it asks for the drawer with the "logbase:open-menu" event.)
export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isOwner, can } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // close the drawer whenever the page changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener('logbase:open-menu', open);
    return () => window.removeEventListener('logbase:open-menu', open);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <>
      {/* desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-gray-200 lg:block print:hidden">
        <SidebarContent pathname={pathname} user={user} isOwner={isOwner} can={can} logout={logout} />
      </aside>

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="animate-slide-in-left absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-gray-200 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <Icon name="close" />
            </button>
            <SidebarContent
              pathname={pathname}
              user={user}
              isOwner={isOwner}
              can={can}
              logout={logout}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
