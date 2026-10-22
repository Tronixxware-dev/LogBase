'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listTransfers } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { toCsv, downloadCsv } from '@/lib/csv';
import { TRANSFER_STATUS, lineText, totalUnits, transferNumber } from '@/lib/transfers';
import { useUser } from '@/components/UserProvider';
import { useShops } from '@/lib/shops';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import FilterBar, { DateRange, inDateRange } from '@/components/FilterBar';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  ListTotal,
  LoadingState,
  PrimaryLink,
  secondaryButtonClass,
} from '@/components/ui';

const DIRECTIONS = [
  { value: 'all', label: 'Both ways' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
];

const STATUSES = [
  { value: 'all', label: 'Any status' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Stock sent between the stores of the business, seen from the store this person is working in.
export default function TransfersPage() {
  const router = useRouter();
  const { can } = useUser();
  const { multiple, active, ready } = useShops();
  const canMove = can('adjustStock');
  const [transfers, setTransfers] = useState([]);
  const [here, setHere] = useState(null);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState('all');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listTransfers()
      .then((data) => {
        setTransfers(data.transfers || []);
        setHere(data.shop || null);
        setWaiting(data.waitingForUs || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const hereId = here && here._id;
  const directionOf = (t) => (hereId && String(t.toShop) === String(hereId) ? 'Incoming' : 'Outgoing');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((t) => {
      if (direction === 'incoming' && String(t.toShop) !== String(hereId)) return false;
      if (direction === 'outgoing' && String(t.fromShop) !== String(hereId)) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (!inDateRange(t.createdAt, from, to)) return false;
      if (!q) return true;
      const text = [transferNumber(t), t.fromName, t.toName, ...(t.lines || []).map((l) => l.productName)];
      return text.some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [transfers, direction, status, from, to, search, hereId]);

  function exportCsv() {
    const csv = toCsv(
      [
        { label: 'Transfer', get: (t) => transferNumber(t) },
        { label: 'Date', get: (t) => formatDateTime(t.createdAt) },
        { label: 'From', get: (t) => t.fromName },
        { label: 'To', get: (t) => t.toName },
        { label: 'Items', get: (t) => (t.lines || []).map(lineText).join('; ') },
        { label: 'Units', get: (t) => totalUnits(t) },
        { label: 'Status', get: (t) => TRANSFER_STATUS[t.status]?.label || t.status },
        { label: 'Sent by', get: (t) => t.createdByName },
        { label: 'Answered by', get: (t) => t.respondedByName },
        { label: 'Reason', get: (t) => t.reason },
        { label: 'Note', get: (t) => t.note },
      ],
      filtered
    );
    downloadCsv('transfers.csv', csv);
  }

  const columns = [
    { key: 'number', label: 'Transfer', render: (t) => <span className="font-medium text-gray-900">{transferNumber(t)}</span> },
    { key: 'date', label: 'Date & time', render: (t) => formatDateTime(t.createdAt) },
    {
      key: 'route',
      label: 'From → To',
      render: (t) => (
        <span>
          {t.fromName} <span className="text-gray-400">→</span> {t.toName}
        </span>
      ),
    },
    { key: 'direction', label: 'Direction', render: (t) => directionOf(t) },
    {
      key: 'items',
      label: 'Items',
      render: (t) => (
        <span className="block max-w-xs text-gray-700">
          {(t.lines || []).slice(0, 2).map(lineText).join(', ')}
          {(t.lines || []).length > 2 && <span className="text-gray-400"> +{t.lines.length - 2} more</span>}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (t) => {
        const s = TRANSFER_STATUS[t.status] || { label: t.status, tone: 'gray' };
        const needsUs = t.status === 'pending' && hereId && String(t.toShop) === String(hereId);
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={s.tone}>{s.label}</Badge>
            {needsUs && <span className="text-xs font-medium text-amber-700">waiting for you</span>}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Transfers"
        subtitle={here ? `Stock sent to and from ${here.name}.` : 'Stock sent between your stores.'}
        action={
          canMove && (!ready || multiple) ? (
            <PrimaryLink href="/dashboard/transfers/new">
              <Icon name="plus" className="h-4 w-4" />
              New transfer
            </PrimaryLink>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {waiting > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {waiting === 1 ? '1 transfer is' : `${waiting} transfers are`} waiting for {here ? here.name : 'this store'} to accept.
        </div>
      )}

      {ready && !multiple && !loading && transfers.length === 0 ? (
        <EmptyState
          icon="transfer"
          message="Transfers move stock between stores. You have one store so far."
          actionHref="/dashboard/stores"
          actionLabel="Add another store"
        />
      ) : (
        <>
          {transfers.length > 0 && (
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: 'Search transfer, store or product', label: 'Search transfers' }}
              filters={[
                { key: 'direction', label: 'Direction', value: direction, onChange: setDirection, options: DIRECTIONS },
                { key: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUSES },
              ]}
              panel={<DateRange label="Sent" from={from} to={to} onFrom={setFrom} onTo={setTo} />}
              panelCount={(from ? 1 : 0) + (to ? 1 : 0)}
              onClear={() => {
                setFrom('');
                setTo('');
              }}
              right={
                <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className={secondaryButtonClass}>
                  <Icon name="download" className="h-4 w-4" />
                  Export
                </button>
              }
            />
          )}

          {loading ? (
            <LoadingState label="Loading transfers…" />
          ) : transfers.length === 0 ? (
            <EmptyState
              icon="transfer"
              message={`No transfers yet${active ? ` for ${active.name}` : ''}.`}
              actionHref={canMove ? '/dashboard/transfers/new' : undefined}
              actionLabel={canMove ? 'Transfer stock to another store' : undefined}
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon="search" message="No transfers match these filters." />
          ) : (
            <>
              <ListTotal count={filtered.length} noun="transfer" />
              <DataTable columns={columns} rows={filtered} onRowClick={(t) => router.push(`/dashboard/transfers/${t._id}`)} />
            </>
          )}
        </>
      )}
    </>
  );
}
