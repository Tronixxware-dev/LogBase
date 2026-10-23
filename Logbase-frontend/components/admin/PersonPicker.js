'use client';

import { useEffect, useState } from 'react';
import { Badge, Field, inputClass } from '@/components/ui';
import { adminReferralPeople } from '@/lib/api';

// Lets the admin pick someone who already has a LogBase account instead of typing their details
export default function PersonPicker({ picked, onPick, onClear, label = 'Pick from people already on LogBase (optional)', hint = 'Search by name, email, phone or business. Their details are filled in below, and they will see their referrals in their own LogBase menu. Or leave this and type a new person in.' }) {
  const [typed, setTyped] = useState('');
  const [people, setPeople] = useState(null);
  const [failed, setFailed] = useState(false);
  const [openList, setOpenList] = useState(false);

  useEffect(() => {
    if (!openList) return undefined;
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const result = await adminReferralPeople({ search: typed.trim() });
        if (current) {
          setPeople(result.items);
          setFailed(false);
        }
      } catch {
        if (current) setFailed(true);
      }
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [typed, openList]);

  if (picked) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 sm:col-span-2">
        <p className="text-sm text-teal-900">
          Picked <span className="font-semibold">{picked.name}</span>
          {picked.businessName ? ` · ${picked.businessName}` : ''}
        </p>
        <button type="button" onClick={onClear} className="text-sm font-medium text-teal-800 underline">
          Choose someone else
        </button>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2">
      <Field label={label} hint={hint}>
        <input
          type="search"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onFocus={() => setOpenList(true)}
          className={inputClass}
          placeholder="Start typing a name, email or business"
          autoComplete="off"
        />
      </Field>
      {openList && (
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {failed ? (
            <p className="px-4 py-3 text-sm text-red-600">Could not load the people. Try again.</p>
          ) : people === null ? (
            <p className="px-4 py-3 text-sm text-gray-500">Loading…</p>
          ) : people.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No one matches that.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {people.map((p) => (
                <li key={p._id}>
                  <button type="button" onClick={() => onPick(p)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{p.name}</span>
                      <span className="block truncate text-xs text-gray-500">{[p.businessName, p.email].filter(Boolean).join(' · ')}</span>
                    </span>
                    {p.existingCode && <Badge tone="amber">Has code {p.existingCode}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
