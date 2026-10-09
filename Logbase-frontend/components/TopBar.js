'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { Icon } from '@/components/Icons';
import { BrandMark } from '@/components/Navbar';
import { ThemeIconButton } from '@/components/ThemeToggle';
import CommandPalette from '@/components/CommandPalette';
import InstallButton from '@/components/InstallButton';
import { pageTitleFor } from '@/lib/nav';

const openMenu = () => window.dispatchEvent(new Event('logbase:open-menu'));
const openSearch = () => window.dispatchEvent(new Event('logbase:open-search'));

// The bar across the top of every page: the page name, quick search (Ctrl K) and the light / dark switch.
// On phones it also carries the menu button and the LogBase mark.
export default function TopBar() {
  const pathname = usePathname();
  const { can, isOwner } = useUser();
  const title = pageTitleFor(pathname, { can, isOwner });

  return (
    <header className="glass sticky top-0 z-30 border-b border-gray-200 print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={openMenu}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs transition active:scale-95 lg:hidden"
        >
          <Icon name="menu" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="LogBase home">
          <BrandMark className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-gray-900">LogBase</span>
        </Link>

        {/* the page name, large screens */}
        <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
          <span className="text-gray-400">LogBase</span>
          <Icon name="chevronRight" className="h-3.5 w-3.5 text-gray-300" />
          <span className="truncate font-medium text-gray-900">{title}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-400 shadow-xs transition hover:border-gray-300 hover:text-gray-500 hover:shadow-sm md:flex"
          >
            <Icon name="search" className="h-4 w-4" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-xs transition active:scale-95 md:hidden"
          >
            <Icon name="search" className="h-5 w-5" />
          </button>
          <InstallButton variant="pill" className="hidden sm:inline-flex" />
          <ThemeIconButton />
        </div>
      </div>
      <CommandPalette />
    </header>
  );
}
