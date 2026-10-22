'use client';

import { useShops } from '@/lib/shops';
import { inputClass } from '@/components/ui';

// "All stores / Main store / Ikeja": narrows a list to one store. Not shown when the business has a single store.
export default function StoreSelect({ value, onChange, className = '' }) {
  const { shops, multiple } = useShops();
  if (!multiple) return null;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Store"
      className={`${inputClass} !w-auto min-w-40 ${className}`}
    >
      <option value="all">All stores</option>
      {shops.map((s) => (
        <option key={s._id} value={s._id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
