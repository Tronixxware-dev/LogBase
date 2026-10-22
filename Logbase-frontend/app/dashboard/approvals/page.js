'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import FilterBar from '@/components/FilterBar';
import { Icon } from '@/components/Icons';
import { Badge, EmptyState, ErrorBanner, ListTotal, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { approveRequest, cancelRequest, declineRequest, listApprovals } from '@/lib/api';
import { alertsChanged, useAlerts } from '@/lib/alerts';
import { KIND_LABELS, STATUS_LABELS, STATUS_TONES, resultHref } from '@/lib/approvals';
import { formatDateTime, timeAgo } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';

const KIND_ICON = { sale: 'sales', return: 'returns', stockAdjustment: 'adjust' };

function Request({ a, isOwner, busy, onApprove, onDecline, onCancel }) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const href = resultHref(a);
  const pending = a.status === 'pending';
  return (
    <li className={`${cardClass} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Icon name={KIND_ICON[a.kind] || 'note'} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{KIND_LABELS[a.kind] || 'Request'}</p>
            <Badge tone={STATUS_TONES[a.status] || 'gray'}>{STATUS_LABELS[a.status] || a.status}</Badge>
          </div>
          <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">{a.summary}</p>
          <p className="mt-1 text-xs text-gray-500" title={formatDateTime(a.createdAt)}>
            {isOwner ? `${a.requestedByName || 'A staff'} asked ` : 'You asked '}
            {timeAgo(a.createdAt)}
            {a.photos > 0 ? ` · ${a.photos} photo${a.photos === 1 ? '' : 's'}` : ''}
          </p>
          {a.reasons && a.reasons.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {a.reasons.map((r) => (
                <li key={r} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <Icon name="alert" className="h-3.5 w-3.5" />
                  {r}
                </li>
              ))}
            </ul>
          )}

          {a.status === 'approved' && (
            <p className="mt-2.5 text-sm text-green-700">
              Approved by {a.decidedByName || 'the administrator'} {timeAgo(a.decidedAt)}.{' '}
              {href && (
                <Link href={href} className="font-medium underline">
                  See what was recorded
                </Link>
              )}
            </p>
          )}
          {a.status === 'declined' && (
            <p className="mt-2.5 text-sm text-red-700">
              Declined by {a.decidedByName || 'the administrator'} {timeAgo(a.decidedAt)}.{a.decisionNote ? ` "${a.decisionNote}"` : ''}
            </p>
          )}
          {a.status === 'failed' && (
            <p className="mt-2.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              It was approved but could not be done: {a.failureMessage || 'something changed in the meantime'}. {isOwner ? 'Ask them to enter it again.' : 'Enter it again.'}
            </p>
          )}

          {pending && !declining && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {isOwner ? (
                <>
                  <button type="button" onClick={() => onApprove(a)} disabled={busy} className={primaryButtonClass}>
                    <Icon name="check" className="h-4 w-4" />
                    {busy ? 'Working…' : 'Approve'}
                  </button>
                  <button type="button" onClick={() => setDeclining(true)} disabled={busy} className={secondaryButtonClass}>
                    Decline
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => onCancel(a)} disabled={busy} className={secondaryButtonClass}>
                  {busy ? 'Working…' : 'Take back this request'}
                </button>
              )}
            </div>
          )}

          {pending && declining && (
            <div className="animate-fade-up mt-3.5 space-y-2">
              <input
                type="text"
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell them why (optional)"
                aria-label="Reason for declining"
                className={inputClass}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onDecline(a, note.trim())} disabled={busy} className={`${secondaryButtonClass} !border-red-200 !text-red-600`}>
                  {busy ? 'Working…' : 'Decline request'}
                </button>
                <button type="button" onClick={() => setDeclining(false)} disabled={busy} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// Requests that wait for an OK. The administrator sees everyone's and answers them; a staff sees their own and can take one back.
export default function ApprovalsPage() {
  const { isOwner } = useUser();
  const { pendingApprovals } = useAlerts();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [status, setStatus] = useState('pending');
  const [kind, setKind] = useState('all');
  const [who, setWho] = useState('all');

  const load = useCallback(() => {
    listApprovals()
      .then((data) => setRows(data.approvals))
      .catch((err) => setError(err.message));
  }, []);

  // opens with the current list, and looks again when the number of waiting requests changes (a new one arrived)
  useEffect(() => {
    load();
  }, [load, pendingApprovals]);

  const replace = (fresh) => setRows((list) => list.map((r) => (r._id === fresh._id ? fresh : r)));

  async function act(a, run, done) {
    setError('');
    setBusyId(a._id);
    try {
      const data = await run();
      replace(data.approval);
      alertsChanged();
      done(data.approval);
    } catch (err) {
      setError(err.message);
      load(); // it may have been answered in the meantime
    } finally {
      setBusyId('');
    }
  }

  const onApprove = (a) =>
    act(a, () => approveRequest(a._id), (fresh) => {
      if (fresh.status === 'approved') notifySuccess('Approved', fresh.summary);
    });
  const onDecline = (a, note) => act(a, () => declineRequest(a._id, note), () => notifySuccess('Declined', a.summary));
  const onCancel = (a) => act(a, () => cancelRequest(a._id), () => notifySuccess('Request taken back', a.summary));

  const people = useMemo(() => {
    const names = Array.from(new Set((rows || []).map((r) => r.requestedByName).filter(Boolean))).sort();
    return [{ value: 'all', label: 'Everyone' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [rows]);

  const shown = useMemo(
    () =>
      (rows || []).filter(
        (r) => (status === 'all' || r.status === status) && (kind === 'all' || r.kind === kind) && (who === 'all' || r.requestedByName === who)
      ),
    [rows, status, kind, who]
  );

  if (!rows && !error) return <LoadingState />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isOwner ? 'Approvals' : 'My requests'}
        subtitle={isOwner ? 'Requests from your team that wait for your OK.' : 'Things you did that the administrator has to approve first.'}
        action={
          isOwner ? (
            <Link href="/dashboard/settings/approvals" className={secondaryButtonClass}>
              <Icon name="settings" className="h-4 w-4" />
              Approval policies
            </Link>
          ) : null
        }
      />
      <ErrorBanner message={error} />

      <FilterBar
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            onChange: setStatus,
            defaultValue: 'pending',
            options: [
              { value: 'pending', label: 'Waiting' },
              { value: 'approved', label: 'Approved' },
              { value: 'declined', label: 'Declined' },
              { value: 'failed', label: 'Could not be done' },
              { value: 'cancelled', label: 'Taken back' },
              { value: 'all', label: 'All' },
            ],
          },
          {
            key: 'kind',
            label: 'Type',
            value: kind,
            onChange: setKind,
            options: [
              { value: 'all', label: 'All types' },
              { value: 'sale', label: 'Sales' },
              { value: 'return', label: 'Returns' },
              { value: 'stockAdjustment', label: 'Stock changes' },
            ],
          },
          isOwner && people.length > 2 ? { key: 'who', label: 'Requested by', value: who, onChange: setWho, options: people } : null,
        ]}
      />

      {rows && shown.length === 0 ? (
        <EmptyState
          icon="approve"
          message={status === 'pending' ? (isOwner ? 'Nothing is waiting for you. When a staff does something your policies cover, it shows up here.' : 'You have no requests waiting.') : 'No requests match these filters.'}
          actionHref={isOwner && status === 'pending' ? '/dashboard/settings/approvals' : undefined}
          actionLabel="Choose what needs approval"
        />
      ) : (
        <>
          <ListTotal count={shown.length} noun="request" />
          <ul className="space-y-3">
            {shown.map((a) => (
              <Request key={a._id} a={a} isOwner={isOwner} busy={busyId === a._id} onApprove={onApprove} onDecline={onDecline} onCancel={onCancel} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
