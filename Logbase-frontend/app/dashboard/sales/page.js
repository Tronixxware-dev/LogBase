'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listSales } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink, StatusBadge, inputClass } from '@/components/ui';
import { PersonChip } from '@/components/Avatar';

const columns = [
  {
    key: 'product',
    label: 'Product',
    render: (s) => (
      <span className="font-medium text-gray-900">
        {s.product?.name || '—'}
        {s.variantLabel && (
          <span className="block text-xs font-normal text-gray-400">{s.variantLabel}</span>
        )}
        {s.saleGroup && (
          <span className="block text-xs font-normal text-primary">Part of a multi-item sale</span>
        )}
      </span>
    ),
  },
  { key: 'date', label: 'Date & time', render: (s) => formatDateTime(s.date || s.createdAt) },
  { key: 'customer', label: 'Customer', render: (s) => s.customerName || s.customer?.name || 'Walk-in' },
  { key: 'sellerName', label: 'Sold by', render: (s) => <PersonChip name={s.sellerName} photoUrl={s.sellerPhotoUrl} /> },
  { key: 'quantity', label: 'Qty' },
  { key: 'totalAmount', label: 'Total', render: (s) => <span className="font-medium text-gray-900">{formatMoney(s.totalAmount)}</span> },
  {
    // what the business paid to deliver the goods (only shown on sales where it did)
    key: 'deliveryCost',
    label: 'Delivery paid',
    render: (s) => (s.deliveryPaidByUs && s.deliveryCost > 0 ? formatMoney(s.deliveryCost) : '—'),
  },
  { key: 'paymentStatus', label: 'Status', render: (s) => <StatusBadge status={s.paymentStatus} /> },
];

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Part paid' },
  { value: 'credit', label: 'On credit' },
];

export default function SalesPage() {
  const router = useRouter();
  const { can, isOwner } = useUser();
  // everyone with "See all sales" / "See insights" gets the full list, anyone else just their own sales
  const seesAll = can('viewAllSales', 'viewInsights');
  const canRecord = can('recordSales');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    listSales()
      .then((data) => setSales(data.sales || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // search by product, customer or seller; narrow by how it was paid
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (status !== 'all' && s.paymentStatus !== status) return false;
      if (!q) return true;
      return [s.product?.name, s.variantLabel, s.customerName, s.customer?.name, s.sellerName].some(
        (v) => v && String(v).toLowerCase().includes(q)
      );
    });
  }, [sales, search, status]);


  return (
    <>
      <PageHeader
        title={seesAll ? 'Sales' : 'My sales'}
        subtitle={seesAll ? undefined : 'The sales you have recorded'}
        action={
          canRecord ? (
            <PrimaryLink href="/dashboard/sales/new">
              <Icon name="plus" className="h-4 w-4" />
              Record sale
            </PrimaryLink>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {sales.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, customer or seller"
              aria-label="Search sales"
              className={`${inputClass} !pl-10`}
            />
          </div>
          <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Payment status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                aria-pressed={status === f.value}
                className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                  status === f.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : sales.length === 0 ? (
        <EmptyState
          icon="sales"
          message="No sales recorded yet."
          actionHref={canRecord ? '/dashboard/sales/new' : undefined}
          actionLabel={canRecord ? 'Record your first sale' : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" message="No sales match your search." />
      ) : (
        <>
          <ListTotal
            count={filtered.length}
            noun="sale"
            className="mb-3"
          />
          <DataTable
            columns={columns.filter((c) => (seesAll || c.key !== 'sellerName') && (isOwner || c.key !== 'deliveryCost'))}
            rows={filtered}
            onRowClick={(s) => router.push(`/dashboard/sales/${s._id}`)}
          />
        </>
      )}
    </>
  );
}
