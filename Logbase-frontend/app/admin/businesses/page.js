'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { EmptyState, ErrorBanner, ListTotal, LoadingState, inputClass } from '@/components/ui';
import { adminBusinesses } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { Pager, STATE_OPTIONS, StateBadge, endsText, timeAgo, useLoad } from '@/components/admin/ui';

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typed, setTyped] = useState('');
  const [state, setState] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  // wait a moment after typing before asking the server
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [typed]);

  const { data, error, loading } = useLoad(() => adminBusinesses({ search, state, sort, page }), [search, state, sort, page]);

  const columns = [
    {
      key: 'name',
      label: 'Business',
      render: (b) => (
        <span>
          <span className="block font-medium text-gray-900">{b.name}</span>
          <span className="block text-xs font-normal text-gray-500">{b.email}</span>
        </span>
      ),
    },
    { key: 'owner', label: 'Owner', render: (b) => b.ownerName || '—' },
    {
      key: 'plan',
      label: 'Plan',
      render: (b) => (
        <span className="flex flex-col items-start gap-1">
          <StateBadge state={b.state} />
          <span className="text-xs text-gray-500">
            {b.planName}
            {b.planState === 'active' || b.planState === 'trialing' ? ` · ${endsText(b)}` : ''}
          </span>
        </span>
      ),
    },
    { key: 'sales', label: 'Sales', align: 'right', render: (b) => `${b.sales.toLocaleString()} · ${formatMoney(b.salesTotal)}` },
    { key: 'users', label: 'People', align: 'right', render: (b) => b.users },
    { key: 'last', label: 'Last active', render: (b) => timeAgo(b.lastActive) },
    { key: 'joined', label: 'Joined', render: (b) => formatDate(b.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Businesses" subtitle="Every business on LogBase. Tap one to see everything about it." />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search by business, owner, email or phone" className={inputClass} />
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
          className={inputClass}
          aria-label="Filter"
        >
          {STATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A to Z</option>
        </select>
      </div>

      <ErrorBanner message={error} />
      {loading && !data ? (
        <LoadingState />
      ) : data && data.items.length === 0 ? (
        <EmptyState message="No business matches that." icon="store" />
      ) : data ? (
        <>
          <ListTotal count={data.total} noun="business" plural="businesses" />
          <DataTable columns={columns} rows={data.items} numbered={false} onRowClick={(b) => router.push(`/admin/businesses/${b._id}`)} />
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
