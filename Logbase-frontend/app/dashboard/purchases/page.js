'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listPurchases } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { purchasePayment } from '@/lib/payables';
import { useUser } from '@/components/UserProvider';
import FilterBar, { DateRange, inDateRange, optionsFrom } from '@/components/FilterBar';
import { useShops } from '@/lib/shops';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { ErrorBanner, LoadingState, EmptyState, ListTotal, PrimaryLink, StatusBadge } from '@/components/ui';

// The cost, payment and supplier columns are only for the owner.
const COST_KEYS = ['costPricePerUnit', 'totalCost', 'deliveryCost', 'payment', 'supplier'];

const columns = [
  {
    key: 'product',
    label: 'Product',
    render: (p) => (
      <span className="font-medium text-gray-900">
        {p.product?.name || '—'}
        {p.variantLabel && <span className="block text-xs font-normal text-gray-400">{p.variantLabel}</span>}
        {p.purchaseGroup && (
          <span className="block text-xs font-normal text-primary">Part of a multi-item purchase</span>
        )}
      </span>
    ),
  },
  { key: 'date', label: 'Date & time', render: (p) => formatDateTime(p.date || p.createdAt) },
  {
    key: 'supplier',
    label: 'Supplier',
    render: (p) =>
      p.supplierName || p.supplier?.name || (
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Not added yet</span>
      ),
  },
  { key: 'purchasedBy', label: 'Purchased by', render: (p) => p.purchasedBy || '—' },
  { key: 'quantity', label: 'Qty' },
  // which store the goods were received into (only when the business has more than one)
  { key: 'storeLabel', label: 'Store', render: (p) => p.storeLabel || '—' },
  {
    key: 'images',
    label: 'Photos',
    render: (p) => (p.images?.length ? `${p.images.length} photo${p.images.length === 1 ? '' : 's'}` : '—'),
  },
  { key: 'costPricePerUnit', label: 'Cost / unit', render: (p) => formatMoney(p.costPricePerUnit) },
  { key: 'totalCost', label: 'Total', render: (p) => formatMoney(p.totalCost) },
  {
    // what the business paid to have the goods delivered (only shown on purchases where it did)
    key: 'deliveryCost',
    label: 'Delivery paid',
    render: (p) => (p.deliveryPaidByUs && p.deliveryCost > 0 ? formatMoney(p.deliveryCost) : '—'),
  },
  // paid in full, or taken on credit (part of it is owed to the supplier)
  {
    key: 'payment',
    label: 'Payment',
    // nothing is owed to anyone until a supplier has been added
    render: (p) => (p.supplierName || p.supplier ? <StatusBadge status={purchasePayment(p).status} /> : '—'),
  },
];

export default function PurchasesPage() {
  const router = useRouter();
  const { isOwner } = useUser();
  // each store keeps its own purchases: the server sends only those of the store being worked in
  const { scopeQuery, scopeReady } = useShops();
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('all');
  const [supplier, setSupplier] = useState('all');
  const [buyer, setBuyer] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const shownColumns = (isOwner ? columns : columns.filter((c) => !COST_KEYS.includes(c.key))).filter((c) => c.key !== 'storeLabel');
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // purchases received together count once
  const withoutSupplier = new Set(
    purchases.filter((p) => !p.supplierName && !p.supplier).map((p) => String(p.purchaseGroup || p._id))
  ).size;

  const supplierOf = (p) => p.supplierName || p.supplier?.name || '';
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
        if (payment !== 'all' && purchasePayment(p).status !== payment) return false;
        if (supplier === 'none' ? supplierOf(p) : supplier !== 'all' && supplierOf(p) !== supplier) return false;
        if (buyer !== 'all' && p.purchasedBy !== buyer) return false;
        if (!inDateRange(p.date || p.createdAt, from, to)) return false;
        if (!q) return true;
        return [p.product?.name, p.variantLabel, supplierOf(p), p.purchasedBy, p.batchNumber].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [purchases, search, payment, supplier, buyer, from, to]);

  useEffect(() => {
    if (!scopeReady) return;
    listPurchases(scopeQuery)
      .then((data) => setPurchases(data.purchases || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scopeReady, scopeQuery]);

  return (
    <>
      <PageHeader
        title="Purchases"
        action={<PrimaryLink href="/dashboard/purchases/new">+ Record purchase</PrimaryLink>}
      />

      <ErrorBanner message={error} />

      {isOwner && withoutSupplier > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {withoutSupplier === 1 ? '1 purchase was' : `${withoutSupplier} purchases were`} recorded without a supplier. Open{' '}
          {withoutSupplier === 1 ? 'it' : 'them'} to add the supplier and say what was paid.
        </p>
      )}

      {purchases.length > 0 && (
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: isOwner ? 'Search product, supplier or batch' : 'Search product or batch', label: 'Search purchases' }}
          filters={[
            isOwner && {
              key: 'payment',
              label: 'Payment',
              value: payment,
              onChange: setPayment,
              options: [
                { value: 'all', label: 'All purchases' },
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Part paid' },
                { value: 'credit', label: 'On credit' },
              ],
            },
            isOwner && {
              key: 'supplier',
              label: 'Supplier',
              value: supplier,
              onChange: setSupplier,
              advanced: true,
              options: [...optionsFrom(purchases, supplierOf, 'All suppliers'), { value: 'none', label: 'Not added yet' }],
            },
            { key: 'buyer', label: 'Purchased by', value: buyer, onChange: setBuyer, advanced: true, options: optionsFrom(purchases, (p) => p.purchasedBy, 'Everyone') },
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
      ) : purchases.length === 0 ? (
        <EmptyState
          message="No purchases recorded yet."
          actionHref="/dashboard/purchases/new"
          actionLabel="Record your first purchase"
        />
      ) : visible.length === 0 ? (
        <EmptyState icon="search" message="No purchases match these filters." />
      ) : (
        <>
        <ListTotal count={visible.length} noun="purchase" />
        <DataTable
          columns={shownColumns}
          rows={visible}
          onRowClick={(p) => router.push(`/dashboard/purchases/${p._id}`)}
        />
        </>
      )}
    </>
  );
}
