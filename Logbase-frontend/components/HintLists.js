'use client';

import { useUser } from '@/components/UserProvider';
import { businessTypeOf } from '@/lib/businessTypes';
import { hintsFor } from '@/lib/productHints';

// The example text and the suggestions that fit this business (phone models for a phone shop, cloth for a tailor...).
export function useHints() {
  const { user } = useUser();
  const type = businessTypeOf(user);
  return { type, hints: hintsFor(type) };
}

// A list of suggestions that appears while typing in the box that has list={id}.
// `options` can be plain words or { name } objects. Anything else can still be typed.
export function Suggestions({ id, options }) {
  const seen = new Set();
  const values = [];
  for (const o of options || []) {
    const v = typeof o === 'string' ? o : o && o.name;
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      values.push(v);
    }
  }
  return (
    <datalist id={id}>
      {values.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  );
}
