'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listCustomers } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Avatar from '@/components/Avatar';
import FilterBar from '@/components/FilterBar';
import { Badge, EmptyState, ErrorBanner, ListTotal, LoadingState, cardClass } from '@/components/ui';

// Customers who owe the business money (sales on credit or part paid), biggest debt first. Open one to record a payment.
export default function CreditPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('owing');

  useEffect(() => {
    listCustomers()
      .then((data) => setCustomers(data.customers || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const owing = useMemo(() => customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance), [customers]);
  const withCredit = useMemo(() => customers.filter((c) => c.balance < 0).sort((a, b) => a.balance - b.balance), [customers]);
  const totalOwed = owing.reduce((sum, c) => sum + c.balance, 0);
  const totalCredit = withCredit.reduce((sum, c) => sum - c.balance, 0);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = view === 'owing' ? owing : withCredit;
    if (!q) return list;
    return list.filter((c) => [c.name, c.phone].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [view, owing, withCredit, search]);

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: (c) => (
        <span className="inline-flex items-center gap-3">
          <Avatar name={c.name} tone="primary" />
          <span className="font-medium text-gray-900">{c.name}</span>
        </span>
      ),
    },
    { key: 'phone', label: 'Phone' },
    {
      key: 'balance',
      label: view === 'owing' ? 'Owes' : 'Store credit',
      render: (c) =>
        c.balance > 0 ? <Badge tone="red">{formatMoney(c.balance)} owed</Badge> : <Badge tone="teal">{formatMoney(-c.balance)} credit</Badge>,
    },
  ];

  return (
    <>
      <PageHeader title="Credit" subtitle="Customers who owe you money, and customers with store credit. Open a customer to record a payment." />
      <ErrorBanner message={error} />

      {!loading && (
        <div className="mb-5 grid max-w-xl grid-cols-2 gap-3">
          <div className={`${cardClass} p-4`}>
            <p className="text-xs text-gray-400">Total owed to you</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatMoney(totalOwed)}</p>
            <p className="text-xs text-gray-400">
              {owing.length} customer{owing.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className={`${cardClass} p-4`}>
            <p className="text-xs text-gray-400">Store credit you hold</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatMoney(totalCredit)}</p>
            <p className="text-xs text-gray-400">
              {withCredit.length} customer{withCredit.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      )}

      {customers.length > 0 && (
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Search name or phone', label: 'Search customers' }}
          filters={[
            {
              key: 'view',
              label: 'Show',
              value: view,
              onChange: setView,
              options: [
                { value: 'owing', label: 'Owing you' },
                { value: 'credit', label: 'Holding store credit' },
              ],
            },
          ]}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState icon="credit" message={view === 'owing' ? (search ? 'No customer matches.' : 'Nobody owes you anything right now.') : search ? 'No customer matches.' : 'No customer has store credit.'} />
      ) : (
        <>
          <ListTotal count={rows.length} noun="customer" />
          <DataTable columns={columns} rows={rows} onRowClick={(c) => router.push(`/dashboard/customers/${c._id}`)} />
        </>
      )}
    </>
  );
}
