'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { lookupSerial } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { warrantyLabel, warrantyStatus, SERIAL_STATUS, EVENT_LABEL } from '@/lib/serials';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/components/UserProvider';
import { ErrorBanner, LoadingState, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900">{children || '—'}</dd>
    </div>
  );
}

// One unit: what it is, where it came from, where it is now and where its warranty stands.
function UnitCard({ unit }) {
  const { isOwner } = useUser(); // who the unit came from is for the administrator only
  const status = SERIAL_STATUS[unit.status] || { label: unit.status, className: 'bg-gray-100 text-gray-700' };
  const warranty = unit.warranty && unit.warranty.endsAt ? warrantyStatus(unit.warranty.endsAt) : null;
  const events = [...(unit.events || [])].reverse(); // newest first

  return (
    <article className={`${cardClass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-mono text-lg font-semibold text-gray-900">{unit.serial}</p>
          <p className="mt-0.5 text-sm text-gray-600">
            {unit.product?.name || 'Product'}
            {unit.variantLabel ? ` · ${unit.variantLabel}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
      </div>

      {unit.status === 'sold' && (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            !warranty ? 'bg-gray-50 text-gray-600' : warranty.state === 'expired' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
          }`}
        >
          {warranty ? `${warrantyLabel(unit.warranty.months)} warranty · ${warranty.text}` : 'No warranty was given on this sale.'}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {isOwner && <Detail label="Supplier">{unit.supplierName}</Detail>}
        <Detail label="Received">{unit.receivedAt ? formatDate(unit.receivedAt) : 'Not recorded'}</Detail>
        {unit.costPrice != null && <Detail label="Cost">{formatMoney(unit.costPrice)}</Detail>}
        {unit.status === 'sold' && (
          <>
            <Detail label="Sold on">{formatDate(unit.soldAt)}</Detail>
            <Detail label="Customer">{unit.customerName}</Detail>
            <Detail label="Sale">
              {unit.sale ? (
                <Link href={`/dashboard/sales/${unit.sale}`} className="font-medium text-primary hover:underline">
                  Open the sale
                </Link>
              ) : null}
            </Detail>
          </>
        )}
      </dl>

      {events.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">History</h3>
          <ol className="space-y-1.5 text-sm">
            {events.map((e, i) => (
              <li key={`${e.type}-${e.at}-${i}`} className="flex flex-wrap justify-between gap-x-3 text-gray-700">
                <span>
                  {EVENT_LABEL[e.type] || e.type}
                  {e.note ? <span className="text-gray-500"> · {e.note}</span> : null}
                </span>
                <span className="text-xs text-gray-400">{formatDateTime(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

// Type an IMEI / serial number (or the last digits of it) and see everything known about that unit.
export default function SerialLookupPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null); // { query, units }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(0);

  async function search(q) {
    const query = q.trim();
    setError('');
    if (query.replace(/\s+/g, '').length < 4) {
      setResult(null);
      setError('Type at least 4 characters of the IMEI / serial number');
      return;
    }
    const ticket = ++latest.current;
    setLoading(true);
    try {
      const data = await lookupSerial(query);
      if (ticket === latest.current) setResult(data);
    } catch (err) {
      if (ticket === latest.current) {
        setResult(null);
        setError(err.message);
      }
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }

  // a link from a sale or purchase opens this page with ?q=<number>
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      setText(q);
      search(q);
    }
  }, []);

  function submit(e) {
    e.preventDefault();
    search(text);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="IMEI lookup" subtitle="Find any phone or device by its IMEI / serial number: where it came from, who bought it and whether its warranty still runs." />

      <form onSubmit={submit} className="mb-6 flex gap-2">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scan or type the IMEI / serial number (the last digits are enough)"
          className={inputClass}
          aria-label="IMEI / serial number"
          autoFocus
        />
        <button type="submit" disabled={loading} className={`${primaryButtonClass} shrink-0`}>
          {loading ? 'Looking…' : 'Look up'}
        </button>
      </form>

      <ErrorBanner message={error} />

      {loading && !result ? (
        <LoadingState label="Looking…" />
      ) : result ? (
        result.units.length === 0 ? (
          <div className={`${cardClass} p-8 text-center`}>
            <p className="text-gray-700">Nothing on record for “{result.query}”.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              A unit is recorded when stock is received with its IMEI / serial number, or when a tracked item is sold. Check the number and try again.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {result.units.length > 1 && (
              <p className="text-sm text-gray-500">
                {result.units.length} units match “{result.query}”.
              </p>
            )}
            {result.units.map((unit) => (
              <UnitCard key={unit._id} unit={unit} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
