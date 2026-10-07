'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listSuppliers } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { suppliersOwed, totalOwed } from '@/lib/payables';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import {
  ErrorBanner,
  LoadingState,
  EmptyState,
  PrimaryLink,
  cardClass,
  inputClass,
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

  useEffect(() => {
    listSuppliers()
      .then((data) => setSuppliers(data.suppliers || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = isOwner && onlyOwed ? suppliersOwed(suppliers) : suppliers;
    if (!q) return pool;
    return pool.filter((s) =>
      [s.name, s.phone, s.email, s.address].some((v) => v && v.toLowerCase().includes(q))
    );
  }, [suppliers, search, onlyOwed, isOwner]);

  const owedTo = isOwner ? suppliersOwed(suppliers) : [];

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle={
          loading
            ? undefined
            : search.trim() && filtered.length !== suppliers.length
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
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email or address"
          className={`${inputClass} mb-4 sm:max-w-xs`}
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
        <EmptyState message="No suppliers match your search." />
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
