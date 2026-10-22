'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listSuppliers } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { suppliersOwed, totalOwed } from '@/lib/payables';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import FilterBar, { optionsFrom } from '@/components/FilterBar';
import {
  ErrorBanner,
  LoadingState,
  EmptyState,
  PrimaryLink,
  cardClass,
} from '@/components/ui';

const columns = [
  { key: 'name', label: 'Supplier', render: (s) => <span className="font-medium text-gray-900">{s.name}</span> },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
];

// only the administrator sees what is owed to each supplier
const owedColumn = {
  key: 'balance',
  label: 'You owe',
  render: (s) =>
    Number(s.balance) > 0.004 ? <span className="font-medium text-red-600">{formatMoney(s.balance)}</span> : <span className="text-gray-400">—</span>,
};

export default function SuppliersPage() {
  const router = useRouter();
  const { isOwner } = useUser();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOwed, setOnlyOwed] = useState(false);
  const [country, setCountry] = useState('all');

  useEffect(() => {
    listSuppliers()
      .then((data) => setSuppliers(data.suppliers || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = isOwner && onlyOwed ? suppliersOwed(suppliers) : suppliers;
    const inCountry = country === 'all' ? pool : pool.filter((s) => describePhone(s.phone).country === country);
    if (!q) return inCountry;
    return inCountry.filter((s) =>
      [s.name, s.phone, s.email, s.address].some((v) => v && v.toLowerCase().includes(q))
    );
  }, [suppliers, search, onlyOwed, isOwner, country]);

  const owedTo = isOwner ? suppliersOwed(suppliers) : [];

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle={
          loading
            ? undefined
            : filtered.length !== suppliers.length
              ? `Showing ${filtered.length} of ${suppliers.length} ${suppliers.length === 1 ? 'supplier' : 'suppliers'}`
              : `${suppliers.length} ${suppliers.length === 1 ? 'supplier' : 'suppliers'} in total`
        }
        action={<PrimaryLink href="/dashboard/suppliers/new">+ Add supplier</PrimaryLink>}
      />

      <ErrorBanner message={error} />

      {owedTo.length > 0 && (
        <div className={`${cardClass} mb-4 flex flex-wrap items-center justify-between gap-3 p-4`}>
          <div>
            <p className="text-sm text-gray-500">You owe suppliers</p>
            <p className="text-2xl font-semibold text-red-600">{formatMoney(totalOwed(suppliers))}</p>
            <p className="text-xs text-gray-400">across {owedTo.length} {owedTo.length === 1 ? 'supplier' : 'suppliers'}</p>
          </div>
          <button
            type="button"
            onClick={() => setOnlyOwed((v) => !v)}
            aria-pressed={onlyOwed}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              onlyOwed ? 'border-primary bg-primary text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {onlyOwed ? 'Showing only who you owe' : 'Show only who you owe'}
          </button>
        </div>
      )}

      {suppliers.length > 0 && (
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Search by name, phone, email or address', label: 'Search suppliers' }}
          filters={[
            isOwner && {
              key: 'owed',
              label: 'Balance',
              value: onlyOwed ? 'owed' : 'all',
              onChange: (v) => setOnlyOwed(v === 'owed'),
              options: [
                { value: 'all', label: 'All suppliers' },
                { value: 'owed', label: 'Who you owe' },
              ],
            },
            { key: 'country', label: 'Country', value: country, onChange: setCountry, options: optionsFrom(suppliers, (s) => describePhone(s.phone).country, 'All countries') },
          ]}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : suppliers.length === 0 ? (
        <EmptyState
          message="No suppliers yet."
          actionHref="/dashboard/suppliers/new"
          actionLabel="Add your first supplier"
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="No suppliers match these filters." />
      ) : (
        <DataTable
          columns={isOwner ? [...columns, owedColumn] : columns}
          rows={filtered}
          onRowClick={(s) => router.push(`/dashboard/suppliers/${s._id}`)}
        />
      )}
    </>
  );
}
