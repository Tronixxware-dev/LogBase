'use client';

import { useEffect, useMemo, useState } from 'react';
import { listReturns } from '@/lib/api';
import { useShops } from '@/lib/shops';
import { formatDateTime, formatMoney } from '@/lib/format';
import { reasonLabel, refundMethodLabel } from '@/lib/returns';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import FilterBar, { DateRange, inDateRange, optionsFrom } from '@/components/FilterBar';
import { RETURN_REASONS } from '@/lib/returns';
import { Badge, EmptyState, ErrorBanner, ListTotal, LoadingState } from '@/components/ui';

// Every return that has been processed: what came back, why, and what the customer was given.
// A return is started from the sale itself (open the sale and choose Return).
export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { scopeQuery, scopeReady } = useShops();
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('all');
  const [stock, setStock] = useState('all');
  const [by, setBy] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // the returns of sales made in the store being worked in
  useEffect(() => {
    if (!scopeReady) return;
    listReturns(scopeQuery)
      .then((data) => setReturns(data.returns || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scopeReady, scopeQuery]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (reason !== 'all' && r.reason !== reason) return false;
      if (stock === 'back' && !r.restock) return false;
      if (stock === 'not' && r.restock) return false;
      if (by !== 'all' && r.processedByName !== by) return false;
      if (!inDateRange(r.date || r.createdAt, from, to)) return false;
      if (!q) return true;
      return [r.customerName, r.processedByName, reasonLabel(r.reason), ...(r.items || []).map((i) => i.productName)].some(
        (v) => v && String(v).toLowerCase().includes(q)
      );
    });
  }, [returns, search, reason, stock, by, from, to]);

  const columns = [
    {
      key: 'items',
      label: 'Returned',
      render: (r) => (
        <span className="block max-w-xs font-medium text-gray-900">
          {(r.items || []).slice(0, 2).map((i) => `${i.productName || 'Product'}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${i.quantity}`).join(', ')}
          {(r.items || []).length > 2 && <span className="font-normal text-gray-400"> +{r.items.length - 2} more</span>}
        </span>
      ),
    },
    { key: 'date', label: 'Date & time', render: (r) => formatDateTime(r.date || r.createdAt) },
    { key: 'customerName', label: 'Customer', render: (r) => r.customerName || 'Walk-in' },
    { key: 'reason', label: 'Reason', render: (r) => reasonLabel(r.reason) },
    { key: 'totalValue', label: 'Value', render: (r) => <span className="font-medium text-gray-900">{formatMoney(r.totalValue)}</span> },
    {
      key: 'refund',
      label: 'Given back',
      render: (r) =>
        r.refundAmount > 0 ? `${formatMoney(r.refundAmount)} ${refundMethodLabel(r.refundMethod)}`.trim() : r.owedReduction > 0 ? 'Cancelled what was owed' : '—',
    },
    { key: 'restock', label: 'Stock', render: (r) => (r.restock ? <Badge tone="green">Back on shelf</Badge> : <Badge tone="gray">Not restocked</Badge>) },
    { key: 'processedByName', label: 'Processed by', render: (r) => r.processedByName || '—' },
  ];

  return (
    <>
      <PageHeader title="Returns" subtitle="Items customers brought back. To take something back, open the sale and choose Return." />
      <ErrorBanner message={error} />

      {returns.length > 0 && (
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Search product, customer or reason', label: 'Search returns' }}
          filters={[
            { key: 'reason', label: 'Reason', value: reason, onChange: setReason, options: [{ value: 'all', label: 'All reasons' }, ...RETURN_REASONS.map((x) => ({ value: x.value, label: x.label }))] },
            {
              key: 'stock',
              label: 'Stock',
              value: stock,
              onChange: setStock,
              options: [
                { value: 'all', label: 'Any' },
                { value: 'back', label: 'Back on shelf' },
                { value: 'not', label: 'Not restocked' },
              ],
            },
            { key: 'by', label: 'Processed by', value: by, onChange: setBy, advanced: true, options: optionsFrom(returns, (r) => r.processedByName, 'Everyone') },
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
      ) : returns.length === 0 ? (
        <EmptyState icon="returns" message="No returns yet." actionHref="/dashboard/sales" actionLabel="Go to sales" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" message="No returns match these filters." />
      ) : (
        <>
          <ListTotal count={filtered.length} noun="return" />
          <DataTable columns={columns} rows={filtered} />
        </>
      )}
    </>
  );
}
