'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listSwaps } from '@/lib/api';
import { useShops } from '@/lib/shops';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import FilterBar, { DateRange, inDateRange, optionsFrom } from '@/components/FilterBar';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink, StatusBadge } from '@/components/ui';
import { PersonChip } from '@/components/Avatar';

const columns = [
  {
    key: 'product',
    label: 'New item',
    render: (s) => (
      <span className="font-medium text-gray-900">
        {s.product?.name || '—'}
        {s.variantLabel && <span className="block text-xs font-normal text-gray-400">{s.variantLabel}</span>}
      </span>
    ),
  },
  {
    key: 'tradeIn',
    label: 'Handed in',
    render: (s) => (
      <span>
        {s.tradeIn?.description}
        <span className="block text-xs text-gray-400">worth {formatMoney(s.tradeIn?.value)}</span>
      </span>
    ),
  },
  { key: 'date', label: 'Date & time', render: (s) => formatDateTime(s.date || s.createdAt) },
  { key: 'customer', label: 'Customer', render: (s) => s.customerName || s.customer?.name || 'Walk-in' },
  {
    key: 'topUp',
    label: 'Customer added',
    render: (s) =>
      s.tradeIn?.refundGiven > 0 ? (
        <span className="text-amber-700">You gave back {formatMoney(s.tradeIn.refundGiven)}</span>
      ) : (
        <span className="font-medium text-gray-900">{formatMoney(s.tradeIn?.cashTopUp)}</span>
      ),
  },
  { key: 'sellerName', label: 'Recorded by', render: (s) => <PersonChip name={s.sellerName} photoUrl={s.sellerPhotoUrl} /> },
  { key: 'paymentStatus', label: 'Status', render: (s) => <StatusBadge status={s.paymentStatus} /> },
];

export default function SwapsPage() {
  const router = useRouter();
  const { can } = useUser();
  const seesAll = can('viewAllSales', 'viewInsights');
  const canRecord = can('recordSales');
  const { scopeQuery, scopeReady } = useShops();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [settle, setSettle] = useState('all');
  const [seller, setSeller] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // the swaps of the store being worked in
  useEffect(() => {
    if (!scopeReady) return;
    listSwaps(scopeQuery)
      .then((data) => setSwaps(data.swaps || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scopeReady, scopeQuery]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return swaps.filter((s) => {
      if (status !== 'all' && s.paymentStatus !== status) return false;
      if (settle === 'added' && !(s.tradeIn?.cashTopUp > 0)) return false;
      if (settle === 'gave' && !(s.tradeIn?.refundGiven > 0)) return false;
      if (seller !== 'all' && s.sellerName !== seller) return false;
      if (!inDateRange(s.date || s.createdAt, from, to)) return false;
      if (!q) return true;
      return [s.product?.name, s.variantLabel, s.customerName, s.customer?.name, s.sellerName, s.tradeIn?.description, s.tradeIn?.imei].some(
        (v) => v && String(v).toLowerCase().includes(q)
      );
    });
  }, [swaps, search, status, settle, seller, from, to]);

  return (
    <>
      <PageHeader
        title="Item swaps"
        subtitle="A customer hands in an old item and takes a new one. They add the difference."
        backHref="/dashboard/sales"
        backLabel="Back to sales"
        action={
          canRecord ? (
            <PrimaryLink href="/dashboard/sales/swaps/new">
              <Icon name="plus" className="h-4 w-4" />
              New swap
            </PrimaryLink>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {swaps.length > 0 && (
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Search item, customer or IMEI', label: 'Search swaps' }}
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: status,
              onChange: setStatus,
              options: [
                { value: 'all', label: 'All swaps' },
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Part paid' },
                { value: 'credit', label: 'On credit' },
              ],
            },
            {
              key: 'settle',
              label: 'Difference',
              value: settle,
              onChange: setSettle,
              options: [
                { value: 'all', label: 'Any' },
                { value: 'added', label: 'Customer added cash' },
                { value: 'gave', label: 'You gave cash back' },
              ],
            },
            seesAll && { key: 'seller', label: 'Sold by', value: seller, onChange: setSeller, advanced: true, options: optionsFrom(swaps, (s) => s.sellerName, 'Everyone') },
          ]}
          panel={<DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />}
          panelCount={(from ? 1 : 0) + (to ? 1 : 0)}
          onClear={() => {
            setFrom('');
            setTo('');
          }}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : swaps.length === 0 ? (
        <EmptyState
          icon="swap"
          message="No swaps recorded yet."
          actionHref={canRecord ? '/dashboard/sales/swaps/new' : undefined}
          actionLabel={canRecord ? 'Record your first swap' : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" message="No swaps match these filters." />
      ) : (
        <>
          <ListTotal count={filtered.length} noun="swap" className="mb-3" />
          <DataTable
            columns={columns.filter((c) => seesAll || c.key !== 'sellerName')}
            rows={filtered}
            onRowClick={(s) => router.push(`/dashboard/sales/${s._id}`)}
          />
        </>
      )}
    </>
  );
}
