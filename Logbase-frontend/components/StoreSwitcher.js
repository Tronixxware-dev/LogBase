'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icons';
import { useShops } from '@/lib/shops';
import { useUser } from '@/components/UserProvider';
import { businessTypeOf, hasFeature } from '@/lib/businessTypes';

// "Store: Ikeja" in the top bar: which store this person is working in. Only shown when the business has more than one store.
// Sales, purchases and stock changes are recorded in this store, and lists show its stock.
export default function StoreSwitcher() {
  const { user } = useUser();
  const { shops, active, multiple, switchTo } = useShops();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!hasFeature(businessTypeOf(user), 'products') || !multiple || !active) return null;

  return (
    <div className="relative min-w-0" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Store: ${active.name}. Change store`}
        className="flex h-10 w-full min-w-0 max-w-[9rem] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-xs transition hover:border-gray-300 hover:shadow-sm sm:max-w-[15rem]"
      >
        <Icon name="store" className="h-4 w-4 shrink-0 text-primary" />
        <span className="hidden text-gray-400 sm:inline">Store:</span>
        <span className="truncate font-medium text-gray-900">{active.name}</span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Choose a store"
          className="animate-pop-in absolute right-0 z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
        >
          {shops.map((s) => {
            const selected = s._id === active._id;
            return (
              <li key={s._id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => (selected ? setOpen(false) : switchTo(s))}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    selected ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon name={selected ? 'check' : 'store'} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.name}</span>
                    {s.address && <span className="block truncate text-xs text-gray-400">{s.address}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
