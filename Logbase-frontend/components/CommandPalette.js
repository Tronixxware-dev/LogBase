'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { Icon } from '@/components/Icons';
import { labelFor, visibleLinks } from '@/lib/nav';
import { currentTheme, setTheme } from '@/lib/theme';

// Quick search: press Ctrl + K (or ⌘ K), or click the search box in the top bar, type a few letters,
// press Enter. It only lists what this person may open.
export default function CommandPalette() {
  const router = useRouter();
  const { can, isOwner } = useUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, []);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('logbase:open-search', show);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('logbase:open-search', show);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const items = useMemo(() => {
    const { top, products, owner } = visibleLinks({ can, isOwner });
    const actions = [
      can('recordSales') && { id: 'a-sale', label: 'Record a sale', icon: 'record', href: '/dashboard/sales/new', group: 'Quick actions' },
      can('managePurchases') && { id: 'a-purchase', label: 'Record a purchase', icon: 'purchases', href: '/dashboard/purchases/new', group: 'Quick actions' },
      can('manageProducts') && { id: 'a-product', label: 'Add a product', icon: 'products', href: '/dashboard/products/new', group: 'Quick actions' },
      can('addCustomers', 'manageCustomers') && { id: 'a-customer', label: 'Add a customer', icon: 'customers', href: '/dashboard/customers/new', group: 'Quick actions' },
      {
        id: 'a-theme',
        label: 'Switch light / dark mode',
        icon: 'moon',
        run: () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'),
        group: 'Quick actions',
      },
    ].filter(Boolean);
    const pages = [...top, ...products, ...owner].map((l) => ({
      id: `p-${l.href}-${l.label}`,
      label: labelFor(l, can),
      icon: l.icon,
      href: l.href,
      group: 'Go to',
    }));
    return [...actions, ...pages];
  }, [can, isOwner]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  function choose(item) {
    close();
    if (item.run) item.run();
    else router.push(item.href);
  }

  function onInputKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      choose(results[active]);
    }
  }

  if (!open) return null;

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] print:hidden" role="dialog" aria-modal="true" aria-label="Quick search">
      <div className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div className="animate-pop-in relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4">
          <Icon name="search" className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            className="h-14 w-full !border-0 !bg-transparent text-sm text-gray-900 !shadow-none outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:block">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-gray-400">Nothing matches “{query}”.</li>}
          {results.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="option" aria-selected={index === active}>
                {header && (
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 first:pt-1">
                    {header}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => choose(item)}
                  onMouseMove={() => setActive(index)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    index === active ? 'bg-primary/10 text-primary' : 'text-gray-700'
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0 opacity-80" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {index === active && <Icon name="arrowRight" className="h-4 w-4 opacity-60" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 px-4 py-2 text-[11px] text-gray-400">
          <span>↑ ↓ to move · Enter to open</span>
          <span>Ctrl K to toggle</span>
        </div>
      </div>
    </div>
  );
}
