'use client';

import { Badge } from '@/components/ui';
import { serviceLabel, stepInfo } from '@/lib/laundry';

// The order's current step, in the words that fit it (a delivery says "Out for delivery" and "Delivered").
export function LaundryStatusBadge({ order }) {
  const info = stepInfo(order);
  return <Badge tone={info.tone}>{info.label}</Badge>;
}

// A small "Express" mark
export function ExpressBadge({ percent }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
      Express{percent ? ` +${percent}%` : ''}
    </span>
  );
}

// "Wash & iron" under an item name, nothing for a plain wash
export function ServiceNote({ service }) {
  if (!service || service === 'wash') return null;
  return <span className="block text-xs font-normal text-gray-500">{serviceLabel(service)}</span>;
}
