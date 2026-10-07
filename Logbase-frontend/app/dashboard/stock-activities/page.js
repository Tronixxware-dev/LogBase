'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listSales, listPurchases, listReturns, listStockAdjustments } from '@/lib/api';
import { buildActivity } from '@/lib/analytics';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
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
  { value: 'in', label: 'Stock in' },
  { value: 'out', label: 'Stock out' },
  { value: 'return', label: 'Returns' },
  { value: 'adjust', label: 'Adjustments' },
];

const ADJUST_LABELS = {
  damaged: 'Damaged',
  lost: 'Lost',
  expired: 'Expired',
  stolen: 'Stolen',
  found: 'Found',
  count: 'Stock count',
  other: 'Other',
};

// the little coloured tag in the "Type" column
const KIND_STYLE = {
  out: { label: 'Stock out', cls: 'bg-orange-50 text-orange-700' },
  in: { label: 'Stock in', cls: 'bg-teal-50 text-teal-700' },
  return: { label: 'Returned', cls: 'bg-sky-50 text-sky-700' },
  adjust: { label: 'Adjusted', cls: 'bg-violet-50 text-violet-700' },
};

const MAX_ROWS = 200;

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value ?? o.days)}
          type="button"
          onClick={() => onChange(o.value !== undefined ? o.value : o.days)}
          aria-pressed={(o.value !== undefined ? o.value : o.days) === value}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            (o.value !== undefined ? o.value : o.days) === value
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Every unit that came in (a purchase) or went out (a sale). It used to sit on the Overview.
export default function StockActivitiesPage() {
  const router = useRouter();
  const { can, isOwner } = useUser();
  // each list is only loaded when the person may see it
  const seesSales = can('recordSales', 'viewAllSales', 'viewInsights');
  const seesPurchases = can('managePurchases', 'viewInsights');
  const seesAllSales = can('viewAllSales', 'viewInsights');
  const seesReturns = can('processReturns', 'viewAllSales', 'viewInsights');
  const seesAdjustments = can('adjustStock', 'manageProducts', 'managePurchases', 'viewInsights');
  const canAdjust = can('adjustStock');

  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [returns, setReturns] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  // opens on "Stock out" (what was sold); pick All or Stock in to see the rest
  const [kind, setKind] = useState('out');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      seesSales ? listSales() : Promise.resolve({ sales: [] }),
      seesPurchases ? listPurchases() : Promise.resolve({ purchases: [] }),
      seesReturns ? listReturns() : Promise.resolve({ returns: [] }),
      seesAdjustments ? listStockAdjustments() : Promise.resolve({ adjustments: [] }),
    ])
      .then(([salesData, purchasesData, returnsData, adjustmentsData]) => {
        setSales(salesData.sales || []);
        setPurchases(purchasesData.purchases || []);
        setReturns(returnsData.returns || []);
        setAdjustments(adjustmentsData.adjustments || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [seesSales, seesPurchases, seesReturns, seesAdjustments]);

  const all = useMemo(
    () => buildActivity({ sales, purchases, returns, adjustments, days }),
    [sales, purchases, returns, adjustments, days]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((a) => kind === 'all' || a.kind === kind)
      .filter((a) => !q || [a.product, a.variant, a.party, a.by, a.noteText].some((v) => v && v.toLowerCase().includes(q)))
      .map((a) => ({ ...a, _id: a.rowKey || `${a.kind}-${a.id}` }));
  }, [all, kind, search]);

  // what actually happened on the shelf: purchases, returned goods put back and stock found add units;
  // sales and stock damaged or lost take them away
  const unitsIn = rows.reduce((sum, a) => sum + (a.stockChange > 0 ? a.stockChange : 0), 0);
  const unitsOut = rows.reduce((sum, a) => sum + (a.stockChange < 0 ? -a.stockChange : 0), 0);
  const shown = rows.slice(0, MAX_ROWS);

  const columns = [
    {
      key: 'product',
      label: 'Product',
      render: (a) => (
        <span className="font-medium text-gray-900">
          {a.product}
          {a.variant && <span className="block text-xs font-normal text-gray-400">{a.variant}</span>}
        </span>
      ),
    },
    {
      key: 'kind',
      label: 'Type',
      render: (a) => {
        const style = KIND_STYLE[a.kind];
        return (
          <span>
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${style.cls}`}>{style.label}</span>
            {a.kind === 'adjust' && a.note && (
              <span className="block text-xs text-gray-400">{ADJUST_LABELS[a.note] || a.note}</span>
            )}
            {a.kind === 'return' && !a.restocked && <span className="block text-xs text-amber-700">not put back</span>}
          </span>
        );
      },
    },
    { key: 'date', label: 'Date & time', render: (a) => formatDateTime(a.date || a.createdAt) },
    {
      key: 'quantity',
      label: 'Qty',
      render: (a) => {
        const change = a.stockChange;
        return (
          <span className={`font-medium ${change < 0 ? 'text-orange-700' : change > 0 ? 'text-teal-700' : 'text-gray-500'}`}>
            {change < 0 ? '−' : change > 0 ? '+' : ''}
            {(change === 0 ? a.quantity : Math.abs(change)).toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'party',
      label: isOwner ? 'Customer / supplier' : 'Customer',
      render: (a) => (a.party ? `${a.kind === 'out' ? 'To' : 'From'} ${a.party}` : '—'),
    },
    { key: 'by', label: 'By', render: (a) => a.by || '—' },
    {
      key: 'amount',
      label: 'Amount',
      // what a purchase cost is for the owner only
      render: (a) => ((a.kind === 'in' || a.kind === 'adjust') && !isOwner ? '—' : a.amount == null ? '—' : formatMoney(a.amount)),
    },
  ];

  function open(a) {
    if (a.kind === 'out' || a.kind === 'return') router.push(`/dashboard/sales/${a.id}`);
    else if (a.kind === 'in' && can('managePurchases')) router.push(`/dashboard/purchases/${a.id}`);
  }

  return (
    <>
      <PageHeader
        title="Stock activities"
        subtitle="Everything that moved your stock: purchases, sales, returns and adjustments, newest first."
        action={
          canAdjust ? (
            <Link
              href="/dashboard/adjust-stock"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Adjust stock
            </Link>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {!loading && (!seesSales || !seesPurchases || !seesAllSales) && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {!seesPurchases && 'Stock in (purchases) is not shown because you do not have access to purchases. '}
          {!seesSales && 'Stock out (sales) is not shown because you do not have access to sales. '}
          {seesSales && !seesAllSales && 'Only the sales you recorded yourself are shown.'}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Period" options={PERIODS} value={days} onChange={setDays} />
        <Segmented label="Type" options={KINDS} value={kind} onChange={setKind} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isOwner ? 'Search product, customer, supplier or name' : 'Search product, customer or name'}
          className={`${inputClass} sm:max-w-xs`}
        />
      </div>

      {!loading && (
        <div className={`${cardClass} mb-4 grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4`}>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">Total records</p>
            <p className="mt-0.5 text-lg font-semibold text-gray-900">{rows.length.toLocaleString()}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">Units in</p>
            <p className="mt-0.5 text-lg font-semibold text-teal-700">+{unitsIn.toLocaleString()}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">Units out</p>
            <p className="mt-0.5 text-lg font-semibold text-orange-700">−{unitsOut.toLocaleString()}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">Net change</p>
            <p className="mt-0.5 text-lg font-semibold text-gray-900">
              {unitsIn - unitsOut > 0 ? '+' : unitsIn - unitsOut < 0 ? '−' : ''}
              {Math.abs(unitsIn - unitsOut).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading stock activities…" />
      ) : rows.length === 0 ? (
        <EmptyState
          message={
            all.length === 0
              ? 'Nothing recorded in this period yet.'
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
