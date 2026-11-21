'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, EmptyState, ErrorBanner, ListTotal, LoadingState, inputClass } from '@/components/ui';
import { adminUsers } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Pager, useLoad } from '@/components/admin/ui';

const ROLES = [
  { value: '', label: 'Everyone' },
  { value: 'owner', label: 'Business owners' },
  { value: 'staff', label: 'Staff' },
  { value: 'agent', label: 'Sales Agents' },
];

const ROLE_VIEW = {
  owner: { tone: 'green', label: 'Owner' },
  staff: { tone: 'gray', label: 'Staff' },
  agent: { tone: 'amber', label: 'Sales Agent' },
};

export default function AdminPeoplePage() {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  // wait a moment after typing before asking the server
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [typed]);

  const { data, error, loading } = useLoad(() => adminUsers({ search, role, page }), [search, role, page]);

  const columns = [
    {
      key: 'name',
      label: 'Person',
      render: (u) => (
        <span>
          <span className="block font-medium text-gray-900">{u.name}</span>
          <span className="block text-xs font-normal text-gray-500">{u.email}</span>
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => {
        const view = ROLE_VIEW[u.role] || { tone: 'gray', label: u.role };
        return (
          <span className="flex flex-col items-start gap-1">
            <Badge tone={view.tone}>{view.label}</Badge>
            {u.jobTitle && <span className="text-xs text-gray-500">{u.jobTitle}</span>}
          </span>
        );
      },
    },
    { key: 'business', label: 'Business', render: (u) => (u.business ? u.business.name : u.role === 'agent' ? 'Sales Agent login' : '—') },
    { key: 'status', label: 'Login', render: (u) => (u.isActive ? <Badge tone="green">On</Badge> : <Badge tone="red">Switched off</Badge>) },
    { key: 'joined', label: 'Joined', render: (u) => formatDate(u.createdAt) },
  ];

  return (
    <>
      <PageHeader title="People" subtitle="Everyone with a login on LogBase: business owners, their staff and Sales Agents. Tap a person to open their business." />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search by name, email or business" className={inputClass} />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className={inputClass}
          aria-label="Filter"
        >
          {ROLES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} />
      {loading && !data ? (
        <LoadingState />
      ) : data && data.items.length === 0 ? (
        <EmptyState message="Nobody matches that." icon="user" />
      ) : data ? (
        <>
          <ListTotal count={data.total} noun="person" plural="people" />
          <DataTable
            columns={columns}
            rows={data.items}
            numbered={false}
            onRowClick={(u) => {
              if (u.business) router.push(`/admin/businesses/${u.business._id}`);
              else if (u.role === 'agent') router.push('/admin/agents');
            }}
          />
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
