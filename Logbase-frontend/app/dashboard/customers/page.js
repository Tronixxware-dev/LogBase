'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listCustomers } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Avatar from '@/components/Avatar';
import { Icon } from '@/components/Icons';
import {
  Badge,
  ErrorBanner,
  LoadingState,
  EmptyState,
  PrimaryLink,
  inputClass,
} from '@/components/ui';

const columns = [
  {
    key: 'name',
    label: 'Customer',
    render: (b) => (
      <span className="inline-flex items-center gap-3">
        <Avatar name={b.name} tone="primary" />
        <span className="font-medium text-gray-900">{b.name}</span>
      </span>
    ),
  },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  {
    key: 'balance',
    label: 'Balance owed',
    render: (b) =>
      b.balance > 0 ? (
        <Badge tone="red">{formatMoney(b.balance)} owed</Badge>
      ) : b.balance < 0 ? (
        <Badge tone="teal">{formatMoney(-b.balance)} credit</Badge>
      ) : (
        <span className="text-gray-400">{formatMoney(0)}</span>
      ),
  },
];

export default function CustomersPage() {
  const router = useRouter();
  const { can } = useUser();
  const canAdd = can('addCustomers', 'manageCustomers');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listCustomers()
      .then((data) => setCustomers(data.customers || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((b) => [b.name, b.phone, b.address].some((v) => v && v.toLowerCase().includes(q)));
  }, [customers, search]);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={
          loading
            ? undefined
            : search.trim() && filtered.length !== customers.length
              ? `Showing ${filtered.length} of ${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`
              : `${customers.length} ${customers.length === 1 ? 'customer' : 'customers'} in total`
        }
        action={
          canAdd ? (
            <PrimaryLink href="/dashboard/customers/new">
              <Icon name="plus" className="h-4 w-4" />
              Add customer
            </PrimaryLink>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {customers.length > 0 && (
        <div className="relative mb-4 sm:max-w-xs">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or address"
            aria-label="Search customers"
            className={`${inputClass} !pl-10`}
          />
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="customers"
          message="No customers yet."
          actionHref={canAdd ? '/dashboard/customers/new' : undefined}
          actionLabel={canAdd ? 'Add your first customer' : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" message="No customers match your search." />
      ) : (
        <DataTable
          // what a customer owes needs the "Manage customers" permission
          columns={can('manageCustomers') ? columns : columns.filter((c) => c.key !== 'balance')}
          rows={filtered}
          onRowClick={(b) => router.push(`/dashboard/customers/${b._id}`)}
        />
      )}
    </>
  );
}
