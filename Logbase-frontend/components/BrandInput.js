'use client';

import { useEffect, useId, useState } from 'react';
import { listProducts } from '@/lib/api';
import { inputClass } from '@/components/ui';

// A text box for the brand (Apple, Samsung, Tecno…). It suggests brands already used on other products,
// so the same brand is always spelled the same way. If the suggestions cannot be loaded, it still works as a plain box.
export default function BrandInput({ value, onChange, name = 'brand' }) {
  const listId = useId();
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let alive = true;
    listProducts()
      .then((data) => {
        if (!alive) return;
        const seen = new Map(); // lower case -> first spelling found
        for (const p of data.products || []) {
          const b = (p.brand || '').trim();
          if (b && !seen.has(b.toLowerCase())) seen.set(b.toLowerCase(), b);
        }
        setBrands(Array.from(seen.values()).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        maxLength={60}
        autoComplete="off"
        className={inputClass}
        placeholder="e.g. Apple, Samsung, Tecno"
      />
      <datalist id={listId}>
        {brands.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
    </>
  );
}
