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
import FilterBar, { DateRange, inDateRange, optionsFrom } from '@/components/FilterBar';
import { describePhone } from '@/lib/phone';
import {
  Badge,
  ErrorBanner,
  LoadingState,
  EmptyState,
  PrimaryLink,
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
  const [balance, setBalance] = useState('all');
  const [country, setCountry] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    listCustomers()
      .then((data) => setCustomers(data.customers || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const countryOf = (c) => describePhone(c.phone).country;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((b) => {
      if (balance === 'owes' && !(b.balance > 0)) return false;
      if (balance === 'credit' && !(b.balance < 0)) return false;
      if (balance === 'clear' && b.balance !== 0 && b.balance != null) return false;
      if (country !== 'all' && countryOf(b) !== country) return false;
      if (!inDateRange(b.createdAt, from, to)) return false;
      if (!q) return true;
      return [b.name, b.phone, b.address].some((v) => v && v.toLowerCase().includes(q));
    });
  }, [customers, search, balance, country, from, to]);
  const filtering = filtered.length !== customers.length;

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={
          loading
            ? undefined
            : filtering
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
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Search by name, phone or address', label: 'Search customers' }}
          filters={[
            can('manageCustomers') && {
              key: 'balance',
              label: 'Balance',
              value: balance,
              onChange: setBalance,
              options: [
                { value: 'all', label: 'All customers' },
                { value: 'owes', label: 'Owes money' },
                { value: 'credit', label: 'Has credit' },
                { value: 'clear', label: 'Nothing owed' },
              ],
            },
            { key: 'country', label: 'Country', value: country, onChange: setCountry, advanced: true, options: optionsFrom(customers, countryOf, 'All countries') },
          ]}
          panel={<DateRange label="Added" from={from} to={to} onFrom={setFrom} onTo={setTo} />}
          panelCount={(from ? 1 : 0) + (to ? 1 : 0)}
          onClear={() => {
            setFrom('');
            setTo('');
          }}
        />
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
        <EmptyState icon="search" message="No customers match these filters." />
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
