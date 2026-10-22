'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getLaundryOrder } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { serviceLabel } from '@/lib/laundry';
import { useUser } from '@/components/UserProvider';
import { ErrorBanner, LoadingState, primaryButtonClass } from '@/components/ui';

// Tags to print and pin on the clothes: one tag for the whole order, or one small label for every piece
// (so a sock can never be parted from its order).
export default function LaundryTagPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('order'); // 'order' | 'pieces'

  useEffect(() => {
    getLaundryOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // one entry for every single piece: "Polo 2 of 5" ... in the order of the register
  const pieces = useMemo(() => {
    if (!order) return [];
    const list = [];
    for (const l of order.lines) {
      for (let n = 0; n < l.quantity; n += 1) list.push({ name: l.itemName, service: l.service, colour: l.colour, stain: l.stain });
    }
    return list;
  }, [order]);

  if (loading) return <LoadingState />;
  if (!order) {
    return (
      <>
        <Link href="/dashboard/laundry" className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
          ← Back to laundry
        </Link>
        <ErrorBanner message={error || 'Laundry order not found'} />
      </>
    );
  }

  const businessName = user?.businessName || '';
  const phone = describePhone(order.customerPhone);
  const delivery = order.handover === 'delivery';
  const due = order.deliveryDate ? formatDate(order.deliveryDate) : '';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 print:hidden">
        <Link href={`/dashboard/laundry/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
          ← Back to the order
        </Link>
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Tags for {order.code}</h1>
        <p className="mb-4 text-sm text-gray-500">Print them, cut them out and pin or tie one on the clothes.</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="What to print">
            {[
              { value: 'order', label: 'One tag for the order' },
              { value: 'pieces', label: `A label for each piece (${pieces.length})` },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={mode === o.value}
                onClick={() => setMode(o.value)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${mode === o.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => window.print()} className={primaryButtonClass}>
            Print tags
          </button>
        </div>
      </div>

      {mode === 'order' ? (
        <article className="mx-auto w-full max-w-sm break-inside-avoid rounded-2xl border-2 border-dashed border-gray-400 bg-white p-5 text-gray-900 print:max-w-none print:rounded-none">
          {order.express && <p className="mb-3 rounded-md bg-black py-1 text-center text-sm font-extrabold uppercase tracking-[0.3em] text-white">Express</p>}
          {businessName && <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-500">{businessName}</p>}
          <p className="mt-1 text-center text-4xl font-extrabold tracking-wide">{order.code}</p>
          <p className="mt-2 text-center text-lg font-semibold">{order.customerName}</p>
          {phone.display && <p className="text-center text-sm text-gray-600">{phone.display}</p>}
          <div className="my-3 border-t border-dashed border-gray-300" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="block text-xs text-gray-500">Pieces</span>
              <span className="text-lg font-bold">{order.totalItems}</span>
            </p>
            <p>
              <span className="block text-xs text-gray-500">Ready by</span>
              <span className="text-lg font-bold">{due || '—'}</span>
            </p>
            <p>
              <span className="block text-xs text-gray-500">Date in</span>
              <span className="font-semibold">{formatDate(order.dateIn)}</span>
            </p>
            <p>
              <span className="block text-xs text-gray-500">Hand-over</span>
              <span className="font-semibold uppercase">{delivery ? 'Delivery' : 'Pick-up'}</span>
            </p>
          </div>
          {delivery && order.deliveryAddress && <p className="mt-2 text-sm text-gray-700">To: {order.deliveryAddress}</p>}
          <div className="my-3 border-t border-dashed border-gray-300" />
          <ul className="space-y-0.5 text-sm">
            {order.lines.map((l, i) => (
              <li key={l._id || i} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {l.itemName}
                  {l.service && l.service !== 'wash' ? ` · ${serviceLabel(l.service)}` : ''}
                  {l.colour ? ` (${l.colour})` : ''}
                </span>
                <span className="shrink-0 font-semibold">×{l.quantity}</span>
              </li>
            ))}
          </ul>
          {order.lines.some((l) => l.stain) && (
            <p className="mt-2 text-xs text-gray-700">
              <span className="font-semibold">Care: </span>
              {order.lines
                .filter((l) => l.stain)
                .map((l) => `${l.itemName}: ${l.stain}`)
                .join('; ')}
            </p>
          )}
          {order.notes && <p className="mt-2 text-xs text-gray-700">Note: {order.notes}</p>}
        </article>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
          {pieces.map((p, i) => (
            <div key={i} className="break-inside-avoid rounded-lg border border-dashed border-gray-400 bg-white p-2.5 text-gray-900">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-extrabold leading-none">{order.code}</span>
                <span className="text-xs font-semibold text-gray-600">
                  {i + 1}/{pieces.length}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate text-xs text-gray-600">
                {[p.service && p.service !== 'wash' ? serviceLabel(p.service) : '', p.colour].filter(Boolean).join(' · ') || ' '}
              </p>
              <p className="mt-1 truncate text-xs text-gray-700">{order.customerName}</p>
              <p className="flex items-center justify-between text-[11px] text-gray-500">
                <span>{due ? `Ready ${due}` : formatDate(order.dateIn)}</span>
                {order.express && <span className="rounded bg-black px-1 font-bold uppercase tracking-wider text-white">Exp</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
