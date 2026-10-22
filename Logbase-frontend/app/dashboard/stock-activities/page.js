'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listSales, listPurchases, listReturns, listStockAdjustments } from '@/lib/api';
import { buildActivity } from '@/lib/analytics';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import { storeNameOf, useShops } from '@/lib/shops';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import FilterBar, { optionsFrom } from '@/components/FilterBar';
import { ErrorBanner, LoadingState, EmptyState, cardClass } from '@/components/ui';

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

// Every unit that came in (a purchase) or went out (a sale). It used to sit on the Overview.
export default function StockActivitiesPage() {
  const router = useRouter();
  const { can, isOwner } = useUser();
  const { shops, multiple, scopeQuery, scopeReady } = useShops();
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
  const [by, setBy] = useState('all');

  // what moved in the store being worked in
  useEffect(() => {
    if (!scopeReady) return;
    Promise.all([
      seesSales ? listSales(scopeQuery) : Promise.resolve({ sales: [] }),
      seesPurchases ? listPurchases(scopeQuery) : Promise.resolve({ purchases: [] }),
      seesReturns ? listReturns(scopeQuery) : Promise.resolve({ returns: [] }),
      seesAdjustments ? listStockAdjustments(scopeQuery) : Promise.resolve({ adjustments: [] }),
    ])
      .then(([salesData, purchasesData, returnsData, adjustmentsData]) => {
        setSales(salesData.sales || []);
        setPurchases(purchasesData.purchases || []);
        setReturns(returnsData.returns || []);
        setAdjustments(adjustmentsData.adjustments || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [seesSales, seesPurchases, seesReturns, seesAdjustments, scopeReady, scopeQuery]);

  const all = useMemo(
    () => buildActivity({ sales, purchases, returns, adjustments, days }),
    [sales, purchases, returns, adjustments, days]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((a) => kind === 'all' || a.kind === kind)
      .filter((a) => by === 'all' || a.by === by)
      .filter((a) => !q || [a.product, a.variant, a.party, a.by, a.noteText].some((v) => v && v.toLowerCase().includes(q)))
      .map((a) => ({ ...a, _id: a.rowKey || `${a.kind}-${a.id}`, store: a.kind === 'return' ? '' : multiple ? storeNameOf({ shopName: a.store }, shops) : '' }));
  }, [all, kind, by, search, multiple, shops]);

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
    ...(multiple ? [{ key: 'store', label: 'Store', render: (a) => a.store || '—' }] : []),
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

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: isOwner ? 'Search product, customer, supplier or name' : 'Search product, customer or name', label: 'Search stock activities' }}
        filters={[
          { key: 'kind', label: 'Type', value: kind, onChange: setKind, defaultValue: 'out', options: KINDS },
          {
            key: 'period',
            label: 'Period',
            value: String(days),
            onChange: (v) => setDays(v === 'null' ? null : Number(v)),
            defaultValue: '30',
            options: PERIODS.map((p) => ({ value: String(p.days), label: p.label })),
          },
          { key: 'by', label: 'Recorded by', value: by, onChange: setBy, advanced: true, options: optionsFrom(all, (a) => a.by, 'Everyone') },
        ]}
      />

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
