'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { acceptTransfer, cancelTransfer, declineTransfer, getTransfer } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { TRANSFER_STATUS, lineText, transferNumber } from '@/lib/transfers';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { Detail, DetailCard, DetailGrid } from '@/components/DetailParts';
import { Badge, ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

export default function TransferDetailPage() {
  const { id } = useParams();
  const { user, isOwner, can } = useUser();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // 'decline' or 'cancel' while the reason box is open
  const [asking, setAsking] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    getTransfer(id)
      .then((data) => setTransfer(data.transfer))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, done) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await action();
      setTransfer(data.transfer);
      setAsking('');
      setReason('');
      notifySuccess(done, transferNumber(data.transfer));
    } catch (err) {
      setError(err.message);
      // somebody may have answered it meanwhile: show how it stands now
      load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Transfer" backHref="/dashboard/transfers" backLabel="Back to transfers" />
        <LoadingState />
      </>
    );
  }

  if (!transfer) {
    return (
      <>
        <PageHeader title="Transfer" backHref="/dashboard/transfers" backLabel="Back to transfers" />
        <ErrorBanner message={error || 'Transfer not found'} />
      </>
    );
  }

  const status = TRANSFER_STATUS[transfer.status] || { label: transfer.status, tone: 'gray' };
  const pending = transfer.status === 'pending';
  const mine = String(transfer.createdBy || '') === String(user?.id || user?._id || '');
  const canAnswer = pending && can('adjustStock');
  const canCancel = pending && (isOwner || mine);

  return (
    <>
      <PageHeader
        title={`Transfer ${transferNumber(transfer)}`}
        subtitle={`${transfer.fromName} → ${transfer.toName}`}
        backHref="/dashboard/transfers"
        backLabel="Back to transfers"
        action={<Badge tone={status.tone}>{status.label}</Badge>}
      />
      <ErrorBanner message={error} />

      {pending && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The stock has left {transfer.fromName} and is on its way. It joins {transfer.toName} when the transfer is accepted, and goes back to{' '}
          {transfer.fromName} if it is declined or cancelled.
        </p>
      )}

      <DetailCard title="Details" icon="transfer" className="max-w-2xl">
        <DetailGrid cols={2}>
          <Detail label="From" icon="store" color="rose">{transfer.fromName}</Detail>
          <Detail label="To" icon="store" color="green">{transfer.toName}</Detail>
          <Detail label="Sent" icon="calendar" color="violet">{formatDateTime(transfer.createdAt)}</Detail>
          <Detail label="Sent by" icon="user" color="sky">{transfer.createdByName}</Detail>
          {!pending && <Detail label={`${status.label} by`} icon="user" color="sky">{transfer.respondedByName}</Detail>}
          {!pending && (
            <Detail label={`${status.label} on`} icon="calendar" color="violet">
              {transfer.respondedAt ? formatDateTime(transfer.respondedAt) : ''}
            </Detail>
          )}
          {transfer.reason && <Detail label="Reason" icon="note" color="amber" wide>{transfer.reason}</Detail>}
          {transfer.note && <Detail label="Note" icon="note" color="amber" wide>{transfer.note}</Detail>}
        </DetailGrid>
      </DetailCard>

      <div className={`${cardClass} mb-5 max-w-2xl divide-y divide-gray-100`}>
        <p className="px-5 py-3 text-sm font-semibold text-gray-900">Items</p>
        {(transfer.lines || []).map((line, i) => (
          <div key={`${line.product}-${line.variant || ''}-${i}`} className="px-5 py-3">
            <p className="text-sm font-medium text-gray-900">{lineText(line)}</p>
            {line.serials && line.serials.length > 0 && (
              <details className="mt-2" open={line.serials.length <= 12}>
                <summary className="cursor-pointer text-xs font-medium text-gray-500">
                  {line.serials.length === line.quantity
                    ? `${line.serials.length} IMEI / serial number${line.serials.length === 1 ? '' : 's'}`
                    : `${line.serials.length} of ${line.quantity} pieces named by IMEI / serial number`}
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {line.serials.map((s) => (
                    <li key={s} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                      {s}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>

      {(canAnswer || canCancel) && (
        <div className="max-w-2xl space-y-4">
          {!asking && (
            <div className="flex flex-wrap gap-3">
              {canAnswer && (
                <button type="button" disabled={busy} onClick={() => run(() => acceptTransfer(id), 'Transfer accepted')} className={primaryButtonClass}>
                  {busy ? 'Please wait…' : 'Accept'}
                </button>
              )}
              {canAnswer && (
                <button type="button" disabled={busy} onClick={() => setAsking('decline')} className={secondaryButtonClass}>
                  Decline
                </button>
              )}
              {canCancel && (
                <button type="button" disabled={busy} onClick={() => setAsking('cancel')} className={secondaryButtonClass}>
                  Cancel transfer
                </button>
              )}
            </div>
          )}

          {asking && (
            <div className={`${cardClass} space-y-3 p-5`}>
              <Field
                label={asking === 'decline' ? 'Why are you declining it?' : 'Why are you cancelling it? (optional)'}
                hint="The stock goes back to the store that sent it."
              >
                <input type="text" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className={inputClass} autoFocus />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy || (asking === 'decline' && !reason.trim())}
                  onClick={() =>
                    asking === 'decline'
                      ? run(() => declineTransfer(id, reason.trim()), 'Transfer declined')
                      : run(() => cancelTransfer(id, reason.trim()), 'Transfer cancelled')
                  }
                  className={primaryButtonClass}
                >
                  {busy ? 'Please wait…' : asking === 'decline' ? 'Decline transfer' : 'Cancel transfer'}
                </button>
                <button type="button" disabled={busy} onClick={() => { setAsking(''); setReason(''); }} className={secondaryButtonClass}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
