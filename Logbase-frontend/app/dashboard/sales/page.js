'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listSales } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import FilterBar, { DateRange, inDateRange, optionsFrom } from '@/components/FilterBar';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink, StatusBadge } from '@/components/ui';
import { PersonChip } from '@/components/Avatar';
import { useShops } from '@/lib/shops';

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
        {s.tradeIn?.description && <span className="block text-xs font-normal text-teal-700">Item swap</span>}
      </span>
    ),
  },
  { key: 'date', label: 'Date & time', render: (s) => formatDateTime(s.date || s.createdAt) },
  { key: 'customer', label: 'Customer', render: (s) => s.customerName || s.customer?.name || 'Walk-in' },
  { key: 'sellerName', label: 'Sold by', render: (s) => <PersonChip name={s.sellerName} photoUrl={s.sellerPhotoUrl} /> },
  { key: 'quantity', label: 'Qty' },
  // which store the sale was made from (only when the business has more than one)
  { key: 'shopName', label: 'Store', render: (s) => s.storeLabel || s.shopName || '—' },
  { key: 'totalAmount', label: 'Total', render: (s) => <span className="font-medium text-gray-900">{formatMoney(s.totalAmount)}</span> },
  {
    // what the business paid to deliver the goods (only shown on sales where it did)
    key: 'deliveryCost',
    label: 'Delivery paid',
    render: (s) => (s.deliveryPaidByUs && s.deliveryCost > 0 ? formatMoney(s.deliveryCost) : '—'),
  },
  { key: 'paymentStatus', label: 'Status', render: (s) => <StatusBadge status={s.paymentStatus} /> },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All sales' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Part paid' },
  { value: 'credit', label: 'On credit' },
];

const KIND_OPTIONS = [
  { value: 'all', label: 'All kinds' },
  { value: 'swap', label: 'Item swaps' },
  { value: 'multi', label: 'Multi-item sales' },
  { value: 'returned', label: 'With returns' },
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
  const [method, setMethod] = useState('all');
  const [seller, setSeller] = useState('all');
  const [kind, setKind] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // each store keeps its own sales: the server sends only those of the store being worked in
  const { scopeQuery, scopeReady } = useShops();

  useEffect(() => {
    if (!scopeReady) return;
    listSales(scopeQuery)
      .then((data) => setSales(data.sales || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scopeReady, scopeQuery]);

  // search by product, customer or seller; narrow by how it was paid
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (status !== 'all' && s.paymentStatus !== status) return false;
      if (method !== 'all' && s.paymentMethod !== method) return false;
      if (seller !== 'all' && s.sellerName !== seller) return false;
      if (kind === 'swap' && !s.tradeIn?.description) return false;
      if (kind === 'multi' && !s.saleGroup) return false;
      if (kind === 'returned' && !(s.returnedQuantity > 0)) return false;
      if (!inDateRange(s.date || s.createdAt, from, to)) return false;
      if (!q) return true;
      return [s.product?.name, s.variantLabel, s.customerName, s.customer?.name, s.sellerName].some(
        (v) => v && String(v).toLowerCase().includes(q)
      );
    });
  }, [sales, search, status, method, seller, kind, from, to]);


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
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Search product, customer or seller', label: 'Search sales' }}
          filters={[
            { key: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
            { key: 'method', label: 'Payment method', value: method, onChange: setMethod, advanced: true, options: optionsFrom(sales, (s) => s.paymentMethod, 'All methods') },
            seesAll && { key: 'seller', label: 'Sold by', value: seller, onChange: setSeller, advanced: true, options: optionsFrom(sales, (s) => s.sellerName, 'Everyone') },
            { key: 'kind', label: 'Kind of sale', value: kind, onChange: setKind, advanced: true, options: KIND_OPTIONS },
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
      ) : sales.length === 0 ? (
        <EmptyState
          icon="sales"
          message="No sales recorded yet."
          actionHref={canRecord ? '/dashboard/sales/new' : undefined}
          actionLabel={canRecord ? 'Record your first sale' : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" message="No sales match these filters." />
      ) : (
        <>
          <ListTotal
            count={filtered.length}
            noun="sale"
            className="mb-3"
          />
          <DataTable
            columns={columns.filter((c) => (seesAll || c.key !== 'sellerName') && (isOwner || c.key !== 'deliveryCost') && c.key !== 'shopName')}
            rows={filtered}
            onRowClick={(s) => router.push(`/dashboard/sales/${s._id}`)}
          />
        </>
      )}
    </>
  );
}
