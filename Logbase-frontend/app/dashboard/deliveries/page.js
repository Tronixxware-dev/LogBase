'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listSales, listPurchases } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { ErrorBanner, LoadingState, EmptyState, cardClass, inputClass } from '@/components/ui';

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: null, label: 'All time' },
];

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'sale', label: 'On sales' },
  { value: 'purchase', label: 'On purchases' },
];

const MAX_ROWS = 200;

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label={label}>
      {options.map((o) => {
        const v = o.value !== undefined ? o.value : o.days;
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={v === value}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              v === value ? 'bg-primary/10 font-medium text-primary' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function lineName(line) {
  if (line.saleGroup || line.purchaseGroup) return 'Multi-item ' + (line.saleGroup ? 'sale' : 'purchase');
  const name = line.product?.name || '—';
  return line.variantLabel ? `${name} (${line.variantLabel})` : name;
}

// Every sale and purchase where the business paid for the delivery. Owner only (it shows what things cost).
// The delivery fee is kept on the first line of a multi-item sale or purchase, so each fee shows once.
export default function DeliveriesPage() {
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([listSales(), listPurchases()])
      .then(([salesData, purchasesData]) => {
        setSales(salesData.sales || []);
        setPurchases(purchasesData.purchases || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const all = useMemo(() => {
    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
    const paid = (l) => l.deliveryPaidByUs && Number(l.deliveryCost) > 0;
    const rows = [
      ...sales.filter(paid).map((s) => ({
        _id: `sale-${s._id}`,
        id: s._id,
        kind: 'sale',
        date: s.date || s.createdAt,
        what: lineName(s),
        party: s.customerName || s.customer?.name || 'Walk-in',
        by: s.sellerName || '',
        amount: Number(s.deliveryCost),
      })),
      ...purchases.filter(paid).map((p) => ({
        _id: `purchase-${p._id}`,
        id: p._id,
        kind: 'purchase',
        date: p.date || p.createdAt,
        what: lineName(p),
        party: p.supplierName || p.supplier?.name || '',
        by: p.purchasedBy || '',
        amount: Number(p.deliveryCost),
      })),
    ];
    return rows
      .filter((r) => !since || new Date(r.date).getTime() >= since)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, purchases, days]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((r) => kind === 'all' || r.kind === kind)
      .filter((r) => !q || [r.what, r.party, r.by].some((v) => v && v.toLowerCase().includes(q)));
  }, [all, kind, search]);

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const onSales = rows.filter((r) => r.kind === 'sale').reduce((sum, r) => sum + r.amount, 0);
  const onPurchases = rows.filter((r) => r.kind === 'purchase').reduce((sum, r) => sum + r.amount, 0);
  const shown = rows.slice(0, MAX_ROWS);

  const columns = [
    { key: 'date', label: 'Date & time', render: (r) => formatDateTime(r.date) },
    {
      key: 'kind',
      label: 'Type',
      render: (r) => (
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
            r.kind === 'sale' ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-700'
          }`}
        >
          {r.kind === 'sale' ? 'Sale' : 'Purchase'}
        </span>
      ),
    },
    { key: 'what', label: 'Item', render: (r) => <span className="font-medium text-gray-900">{r.what}</span> },
    {
      key: 'party',
      label: 'Customer / supplier',
      render: (r) => (r.party ? `${r.kind === 'sale' ? 'To' : 'From'} ${r.party}` : '—'),
    },
    { key: 'by', label: 'Recorded by', render: (r) => r.by || '—' },
    { key: 'amount', label: 'Delivery paid', render: (r) => <span className="font-medium">{formatMoney(r.amount)}</span> },
  ];

  function open(r) {
    router.push(r.kind === 'sale' ? `/dashboard/sales/${r.id}` : `/dashboard/purchases/${r.id}`);
  }

  return (
    <>
      <PageHeader
        title="Deliveries"
        subtitle="What you paid for deliveries, to customers on sales and to get stock on purchases. Newest first."
      />

      <ErrorBanner message={error} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Period" options={PERIODS} value={days} onChange={setDays} />
        <Segmented label="Type" options={KINDS} value={kind} onChange={setKind} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item, customer, supplier or name"
          className={`${inputClass} sm:max-w-xs`}
        />
      </div>

      {!loading && (
        <div className={`${cardClass} mb-4 grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4`}>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">Total paid</p>
            <p className="mt-0.5 text-lg font-semibold text-gray-900">{formatMoney(total)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">On sales</p>
            <p className="mt-0.5 text-lg font-semibold text-orange-700">{formatMoney(onSales)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">On purchases</p>
            <p className="mt-0.5 text-lg font-semibold text-teal-700">{formatMoney(onPurchases)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">Deliveries</p>
            <p className="mt-0.5 text-lg font-semibold text-gray-900">
              {rows.length.toLocaleString()}
              {rows.length > 0 && (
                <span className="ml-1 text-xs font-normal text-gray-400">
                  avg {formatMoney(Math.round(total / rows.length))}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading deliveries…" />
      ) : rows.length === 0 ? (
        <EmptyState
          message={
            all.length === 0
              ? 'No delivery fees paid in this period. They appear here when a sale or purchase is recorded with “Are you paying for the delivery?” set to Yes.'
              : 'Nothing matches. Try another type, period or search.'
          }
        />
      ) : (
        <>
          <DataTable columns={columns} rows={shown} onRowClick={open} />
          {rows.length > MAX_ROWS && (
            <p className="mt-3 text-center text-xs text-gray-400">
              Showing the latest {MAX_ROWS} of {rows.length.toLocaleString()}. Choose a shorter period or search to narrow it down.
            </p>
          )}
        </>
      )}
    </>
  );
}
