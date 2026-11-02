'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  addTailorFitting,
  addTailorMaterial,
  addTailorPayment,
  addTailorPiece,
  deleteTailorOrder,
  deleteTailorPhoto,
  getTailorOrder,
  listMeasurements,
  listProducts,
  listTailorStyles,
  listWorkers,
  removeTailorFitting,
  removeTailorMaterial,
  removeTailorPiece,
  setTailorPieceDone,
  setTailorStatus,
  updateTailorFitting,
  updateTailorOrder,
  updateTailorPiece,
  uploadTailorPhotos,
} from '@/lib/api';
import { formatDate, formatDateTime, formatMoney, variantLabel } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { TAILOR_STATUSES, dayInputValue } from '@/lib/jobs';
import { UNITS, pieceLine, unitShort } from '@/lib/tailor';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { forShop } from '@/lib/shopStorage';
import { Detail, DetailCard, DetailGrid, MoneyStrip } from '@/components/DetailParts';
import { HistoryList, JobStatusBadge, PaymentForm, PaymentsList, SectionCard, StatusButtons } from '@/components/JobParts';
import { PieceForm, emptyPiece, pieceFromOrder, pieceToPayload } from '@/components/TailorParts';
import { ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

export default function TailorOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { can, isOwner } = useUser();
  const canWrite = can('recordSales');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [askFree, setAskFree] = useState(false);

  useEffect(() => {
    getTailorOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Runs one change on the order. `work` returns the promise of the server's answer ({ order }).
  const act = useCallback(async (work, message) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const data = await work();
      if (data && data.order) setOrder(data.order);
      if (message) setNotice(message);
      return true;
    } catch (err) {
      setError(err.offline ? 'There is no connection, so we could not confirm that this was saved. Look at the page again before you try again.' : err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  if (loading) return <LoadingState />;
  if (!order) {
    return (
      <>
        <PageHeader title="Order not found" backHref="/dashboard/tailor" backLabel="Back to orders" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const open = order.status !== 'delivered';
  const phone = describePhone(order.customerPhone);
  const hasMoney = order.payments && order.payments.length > 0;
  const profit = isOwner && order.materialsCost !== undefined ? order.total - order.materialsCost - (order.labourCost || 0) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${order.code} · ${order.customerName}`}
        subtitle={`${order.pieceCount} ${order.pieceCount === 1 ? 'garment' : 'garments'} · taken in ${formatDate(order.receivedAt)}${order.dueDate ? ` · promised ${formatDate(order.dueDate)}` : ''}`}
        backHref="/dashboard/tailor"
        backLabel="Back to orders"
        action={
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/tailor/${order._id}/slip`} className={secondaryButtonClass}>
              Order slip
            </Link>
            <JobStatusBadge statuses={TAILOR_STATUSES} value={order.status} />
          </div>
        }
      />

      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {/* where the order is */}
      <SectionCard title="Progress">
        {canWrite && open ? (
          <>
            <StatusButtons
              statuses={TAILOR_STATUSES}
              current={order.status}
              busy={busy}
              onChange={(status) => {
                setAskFree(false);
                if (status === 'delivered' && !(order.total > 0) && !(order.amountPaid > 0)) {
                  setAskFree(true);
                  return;
                }
                act(() => setTailorStatus(order._id, status), `Marked "${TAILOR_STATUSES.find((s) => s.value === status).label}"`);
              }}
            />
            {askFree && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>This order has no price and nothing has been paid. Hand over the clothes free of charge?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await act(() => setTailorStatus(order._id, 'delivered', undefined, { free: true }), 'Marked "Delivered"');
                      if (ok) setAskFree(false);
                    }}
                    className={primaryButtonClass}
                  >
                    Yes, it is free of charge
                  </button>
                  <button type="button" onClick={() => setAskFree(false)} className={secondaryButtonClass}>
                    No, I will set the price
                  </button>
                </div>
              </div>
            )}
            {order.balance > 0 && <p className="mt-3 text-xs text-gray-500">The customer still owes {formatMoney(order.balance)}. Record their payment below before you hand over the clothes.</p>}
            <p className="mt-3 text-xs text-gray-500">Marking an order Ready or Delivered also marks every garment finished and credits the tailors.</p>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            {open ? 'You can look at this order but not change it.' : `Delivered on ${formatDateTime(order.deliveredAt)}. A delivered order is final.`}
          </p>
        )}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <HistoryList history={order.history} statuses={TAILOR_STATUSES} />
        </div>
      </SectionCard>

      {/* the money and the order's own facts */}
      <DetailCard
        title="Order"
        icon="scissors"
        action={
          canWrite && open && !editing ? (
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-primary hover:underline">
              Edit
            </button>
          ) : undefined
        }
      >
        {editing ? (
          <EditForm
            order={order}
            busy={busy}
            onCancel={() => setEditing(false)}
            onSave={async (payload) => {
              const ok = await act(() => updateTailorOrder(order._id, payload), 'Order updated');
              if (ok) setEditing(false);
            }}
          />
        ) : (
          <>
            <MoneyStrip
              items={[
                order.total > 0 ? { label: 'Price', value: formatMoney(order.total), tone: 'brand', note: order.discount > 0 ? `after ${formatMoney(order.discount)} off` : undefined } : { label: 'Price', value: 'Not set yet', tone: 'plain' },
                { label: 'Paid so far', value: formatMoney(order.amountPaid), tone: 'good' },
                order.total > 0
                  ? order.balance > 0
                    ? { label: 'Balance', value: formatMoney(order.balance), tone: 'bad' }
                    : { label: 'Balance', value: formatMoney(0), tone: 'good', note: 'Paid in full' }
                  : { label: 'Balance', value: '—', tone: 'plain' },
              ]}
            />
            <DetailGrid>
              <Detail label="Customer" icon="user" color="sky">{order.customerName}</Detail>
              <Detail label="Phone number" icon="phone" color="sky">{phone.display}</Detail>
              <Detail label="Occasion" icon="sparkle" color="violet">{order.occasion}</Detail>
              <Detail label="Promised for" icon="calendar" color="violet">{order.dueDate ? formatDate(order.dueDate) : ''}</Detail>
              <Detail label="Measured in" icon="ruler" color="teal">{order.unit === 'cm' ? 'Centimetres' : 'Inches'}</Detail>
              <Detail label="Taken in by" icon="user" color="sky">{order.recordedByName}</Detail>
              {order.readyAt && <Detail label="Ready since" icon="check" color="green">{formatDateTime(order.readyAt)}</Detail>}
              {order.notes && <Detail label="Notes" icon="note" color="amber" wide>{order.notes}</Detail>}
            </DetailGrid>
            {profit !== null && (
              <p className="mt-4 flex flex-wrap justify-between gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-500">
                  Your profit on this order (only you see this): {formatMoney(order.total)} − materials {formatMoney(order.materialsCost)} − tailors {formatMoney(order.labourCost || 0)}
                </span>
                <span className={`font-semibold ${profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatMoney(profit)}</span>
              </p>
            )}
          </>
        )}
      </DetailCard>

      <GarmentsCard order={order} open={open} canWrite={canWrite} isOwner={isOwner} busy={busy} act={act} />
      <FittingsCard order={order} open={open} canWrite={canWrite} busy={busy} act={act} />
      <PhotosCard order={order} open={open} canWrite={canWrite} busy={busy} act={act} />
      <MaterialsCard order={order} open={open} canWrite={canWrite} isOwner={isOwner} busy={busy} act={act} />

      {/* money */}
      <SectionCard title="Payments">
        <PaymentsList payments={order.payments} />
        {canWrite && open && (order.balance > 0 || order.total <= 0) && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Take a payment</p>
            <PaymentForm balance={order.balance > 0 ? order.balance : 0} busy={busy} onSubmit={(payload) => act(() => addTailorPayment(order._id, payload), 'Payment recorded')} />
          </div>
        )}
      </SectionCard>

      {/* an order entered by mistake */}
      {isOwner && open && !hasMoney && (
        <div className={`${cardClass} p-6`}>
          <h2 className="mb-1 text-lg font-medium text-gray-900">Entered by mistake?</h2>
          <p className="mb-4 text-xs text-gray-400">Only possible before any money is taken. Materials taken from stock go back into stock.</p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">Delete this order for good?</span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await deleteTailorOrder(order._id);
                    router.push('/dashboard/tailor');
                  } catch (err) {
                    setError(err.message);
                    setConfirmDelete(false);
                    setBusy(false);
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={secondaryButtonClass}>
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-medium text-red-600 hover:underline">
              Delete this order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditForm({ order, busy, onSave, onCancel }) {
  const [occasion, setOccasion] = useState(order.occasion || '');
  const [dueDate, setDueDate] = useState(order.dueDate ? dayInputValue(order.dueDate) : '');
  const [unit, setUnit] = useState(order.unit || 'in');
  const [discount, setDiscount] = useState(order.discount > 0 ? String(order.discount) : '');
  const [notes, setNotes] = useState(order.notes || '');
  const [problem, setProblem] = useState('');

  function submit(e) {
    e.preventDefault();
    setProblem('');
    const payload = { occasion, dueDate, unit, notes };
    const d = Number(discount) || 0;
    if (d !== (order.discount || 0)) payload.discount = d;
    onSave(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Occasion">
          <input type="text" maxLength={100} value={occasion} onChange={(e) => setOccasion(e.target.value)} className={inputClass} placeholder="Wedding, owambe, school…" />
        </Field>
        <Field label="Promised date">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Measuring unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Discount (₦)" hint={order.amountPaid > 0 ? `The price cannot go below ${formatMoney(order.amountPaid)} (already paid).` : undefined}>
          <input type="number" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>
      {problem && <p className="text-sm text-red-600">{problem}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ---------------------------- garments ---------------------------- */

function GarmentsCard({ order, open, canWrite, isOwner, busy, act }) {
  const [extras, setExtras] = useState(null); // { styles, tailors, saved } read when the first form opens
  const [editingId, setEditingId] = useState(null); // a garment id, or 'new'
  const [form, setForm] = useState(null);
  const [problem, setProblem] = useState('');

  function loadExtras() {
    if (extras) return;
    setExtras({ styles: [], tailors: [], saved: [] });
    Promise.all([
      listTailorStyles().catch(() => ({ styles: [] })),
      listWorkers({ kind: 'tailor', active: '1' }).catch(() => ({ workers: [] })),
      listMeasurements({ customer: order.customer }).catch(() => ({ measurements: [] })),
    ]).then(([s, w, m]) => setExtras({ styles: s.styles || [], tailors: w.workers || [], saved: m.measurements || [] }));
  }

  function startEdit(piece) {
    loadExtras();
    setProblem('');
    setEditingId(piece._id);
    setForm(pieceFromOrder(piece, extras ? extras.styles : []));
  }

  function startAdd() {
    loadExtras();
    setProblem('');
    setEditingId('new');
    setForm(emptyPiece());
  }

  async function save(e) {
    e.preventDefault();
    setProblem('');
    if (!form.style.trim()) return setProblem('Enter what to sew');
    const payload = pieceToPayload(form, { isOwner });
    const ok = await act(
      () => (editingId === 'new' ? addTailorPiece(order._id, payload) : updateTailorPiece(order._id, editingId, payload)),
      editingId === 'new' ? 'Garment added' : 'Garment updated'
    );
    if (ok) {
      setEditingId(null);
      setForm(null);
    }
  }

  const pieces = order.pieces || [];
  const unit = order.unit;

  return (
    <SectionCard
      title={`Garments (${order.piecesDone} of ${order.pieceCount} finished)`}
      action={
        canWrite && open && editingId === null ? (
          <button type="button" onClick={startAdd} className="text-sm font-medium text-primary hover:underline">
            Add a garment
          </button>
        ) : undefined
      }
    >
      <ul className="space-y-4">
        {pieces.map((p) =>
          editingId === p._id && form ? (
            <li key={p._id}>
              <form onSubmit={save} className="space-y-3">
                <PieceForm
                  piece={form}
                  onChange={setForm}
                  index={pieces.findIndex((x) => x._id === p._id)}
                  styles={extras ? extras.styles : []}
                  tailors={extras ? extras.tailors : []}
                  saved={extras ? extras.saved : []}
                  unit={unit}
                  isOwner={isOwner}
                  canRemove={false}
                />
                {problem && <p className="text-sm text-red-600">{problem}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className={primaryButtonClass}>
                    {busy ? 'Saving…' : 'Save garment'}
                  </button>
                  <button type="button" onClick={() => { setEditingId(null); setForm(null); }} className={secondaryButtonClass}>
                    Cancel
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li key={p._id} className={`rounded-xl border p-4 ${p.done ? 'border-green-200 bg-green-50/40' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {p.quantity > 1 ? `${p.quantity} × ` : ''}
                    {p.style}
                    {p.done && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Finished</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {p.fabricFrom === 'shop' ? 'Cloth supplied by us' : 'Customer brought the cloth'}
                    {p.fabric ? ` · ${p.fabric}` : ''}
                    {p.workerName ? ` · sewn by ${p.workerName}` : ' · no tailor yet'}
                    {isOwner && p.worker && p.pay > 0 ? ` · pay ${formatMoney(p.pay)}` : ''}
                  </p>
                </div>
                <p className="tabular shrink-0 text-sm font-medium text-gray-900">{p.price > 0 ? formatMoney(pieceLine(p)) : 'No price'}</p>
              </div>
              {p.details && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{p.details}</p>}
              {(p.measurements || []).length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs sm:grid-cols-3">
                  {p.measurements.map((m) => (
                    <div key={m.name} className="flex justify-between gap-2">
                      <dt className="truncate text-gray-500">{m.name}</dt>
                      <dd className="font-medium text-gray-900">
                        {m.value} {unitShort(unit)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {canWrite && open && editingId === null && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <button type="button" disabled={busy} onClick={() => act(() => setTailorPieceDone(order._id, p._id, !p.done), p.done ? 'Marked not finished' : 'Marked finished')} className="font-medium text-primary hover:underline disabled:opacity-50">
                    {p.done ? 'Not finished after all' : 'Mark as finished'}
                  </button>
                  <button type="button" onClick={() => startEdit(p)} className="font-medium text-gray-600 hover:underline">
                    Edit
                  </button>
                  {pieces.length > 1 && (
                    <RemoveButton
                      busy={busy}
                      label="Remove"
                      question={`Remove ${p.style} from the order?`}
                      onConfirm={() => act(() => removeTailorPiece(order._id, p._id), 'Garment removed')}
                    />
                  )}
                </div>
              )}
            </li>
          )
        )}
        {editingId === 'new' && form && (
          <li>
            <form onSubmit={save} className="space-y-3">
              <PieceForm
                piece={form}
                onChange={setForm}
                index={pieces.length}
                styles={extras ? extras.styles : []}
                tailors={extras ? extras.tailors : []}
                saved={extras ? extras.saved : []}
                unit={unit}
                isOwner={isOwner}
                canRemove={false}
              />
              {problem && <p className="text-sm text-red-600">{problem}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={primaryButtonClass}>
                  {busy ? 'Saving…' : 'Add garment'}
                </button>
                <button type="button" onClick={() => { setEditingId(null); setForm(null); }} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
            </form>
          </li>
        )}
      </ul>
    </SectionCard>
  );
}

// "Remove" that asks first
function RemoveButton({ label, question, onConfirm, busy }) {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="text-gray-600">{question}</span>
        <button type="button" disabled={busy} onClick={() => { setAsking(false); onConfirm(); }} className="font-medium text-red-600 hover:underline disabled:opacity-50">
          Yes
        </button>
        <button type="button" onClick={() => setAsking(false)} className="font-medium text-gray-500 hover:underline">
          No
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setAsking(true)} className="font-medium text-red-600 hover:underline">
      {label}
    </button>
  );
}

/* ---------------------------- fittings ---------------------------- */

const FITTING_LABEL = { scheduled: 'Booked', done: 'Done', missed: 'Missed' };

function FittingsCard({ order, open, canWrite, busy, act }) {
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const fittings = [...(order.fittings || [])].sort((a, b) => new Date(a.at) - new Date(b.at));

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    if (!day) return setProblem('Choose the day of the fitting');
    const ok = await act(() => addTailorFitting(order._id, { at: day, note: note.trim() || undefined }), 'Fitting booked');
    if (ok) {
      setAdding(false);
      setDay('');
      setNote('');
    }
  }

  return (
    <SectionCard
      title="Fittings"
      action={
        canWrite && open && !adding ? (
          <button type="button" onClick={() => { setDay(dayInputValue()); setAdding(true); }} className="text-sm font-medium text-primary hover:underline">
            Book a fitting
          </button>
        ) : undefined
      }
    >
      {fittings.length === 0 ? (
        <p className="text-sm text-gray-400">No fitting booked.</p>
      ) : (
        <ul className="divide-y divide-gray-100 text-sm">
          {fittings.map((f) => (
            <li key={f._id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{formatDate(f.at)}</p>
                  {f.note && <p className="mt-0.5 whitespace-pre-wrap text-gray-600">{f.note}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${f.status === 'done' ? 'bg-green-100 text-green-700' : f.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>
                  {FITTING_LABEL[f.status] || f.status}
                </span>
              </div>
              {canWrite && open && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {f.status !== 'done' && (
                    <button type="button" disabled={busy} onClick={() => act(() => updateTailorFitting(order._id, f._id, { status: 'done' }), 'Fitting marked done')} className="font-medium text-primary hover:underline disabled:opacity-50">
                      They came
                    </button>
                  )}
                  {f.status !== 'missed' && (
                    <button type="button" disabled={busy} onClick={() => act(() => updateTailorFitting(order._id, f._id, { status: 'missed' }), 'Fitting marked missed')} className="font-medium text-gray-600 hover:underline disabled:opacity-50">
                      They did not come
                    </button>
                  )}
                  <NoteEditor fitting={f} busy={busy} onSave={(text) => act(() => updateTailorFitting(order._id, f._id, { note: text }), 'Note saved')} />
                  <RemoveButton busy={busy} label="Remove" question="Remove this fitting?" onConfirm={() => act(() => removeTailorFitting(order._id, f._id), 'Fitting removed')} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={submit} className="mt-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Day of the fitting">
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Note (optional)">
              <input type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="e.g. Come with the shoes" />
            </Field>
          </div>
          {problem && <p className="text-sm text-red-600">{problem}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? 'Saving…' : 'Book fitting'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

// What to change after a fitting ("take in the waist")
function NoteEditor({ fitting, onSave, busy }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(fitting.note || '');
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="font-medium text-gray-600 hover:underline">
        {fitting.note ? 'Change note' : 'Add note'}
      </button>
    );
  }
  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      <input type="text" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} !py-1.5`} placeholder="e.g. Take in the waist, lengthen the sleeves" autoFocus />
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          await onSave(text);
          setEditing(false);
        }}
        className="font-medium text-primary hover:underline disabled:opacity-50"
      >
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-gray-500 hover:underline">
        Cancel
      </button>
    </span>
  );
}

/* ----------------------------- photos ----------------------------- */

function PhotosCard({ order, open, canWrite, busy, act }) {
  const input = useRef(null);
  const photos = order.photos || [];

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    await act(() => uploadTailorPhotos(order._id, files), files.length === 1 ? 'Photo added' : 'Photos added');
  }

  return (
    <SectionCard
      title="Style pictures"
      action={
        canWrite && open ? (
          <>
            <button type="button" disabled={busy} onClick={() => input.current && input.current.click()} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
              Add pictures
            </button>
            <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
          </>
        ) : undefined
      }
    >
      {photos.length === 0 ? (
        <p className="text-sm text-gray-400">No picture yet. Add the style the customer wants so the tailor can follow it.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((img) => (
            <div key={img._id || img.publicId} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
              <a href={img.url} target="_blank" rel="noreferrer">
                <img src={img.url} alt="Style the customer wants" className="h-full w-full object-cover" />
              </a>
              {canWrite && open && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Remove this picture"
                  onClick={() => act(() => deleteTailorPhoto(order._id, img._id), 'Picture removed')}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------------------- materials ---------------------------- */

function MaterialsCard({ order, open, canWrite, isOwner, busy, act }) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('stock');
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [problem, setProblem] = useState('');

  const materials = order.materials || [];

  function startAdding() {
    setAdding(true);
    setProblem('');
    if (products === null) {
      listProducts()
        .then((data) => setProducts(forShop((data.products || []).filter((p) => !p.tracksSerials))))
        .catch((err) => {
          setProducts([]);
          setLoadError(err.message);
        });
    }
  }

  const product = (products || []).find((p) => p._id === productId);
  const variants = product?.variants || [];
  const variant = variants.find((v) => v._id === variantId);

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    const qty = Number(quantity);
    if (!(qty > 0)) return setProblem('Enter how much was used');
    let payload;
    if (mode === 'stock') {
      if (!product) return setProblem('Choose the item from your stock');
      if (!Number.isInteger(qty)) return setProblem('Items from stock are used in whole numbers');
      if (variants.length > 0 && !variant) return setProblem(`Choose the colour / size of ${product.name}`);
      payload = { product: product._id, quantity: qty };
      if (variant) payload.variant = variant._id;
    } else {
      if (!name.trim()) return setProblem('Enter the name of the material');
      payload = { name: name.trim(), quantity: qty };
      if (isOwner && cost !== '') payload.cost = Number(cost);
    }
    const ok = await act(() => addTailorMaterial(order._id, payload), 'Material added to the order');
    if (ok) {
      setAdding(false);
      setProductId('');
      setVariantId('');
      setQuantity('1');
      setName('');
      setCost('');
      setProducts(null);
    }
  }

  return (
    <SectionCard
      title="Cloth & materials used"
      action={
        canWrite && open && !adding ? (
          <button type="button" onClick={startAdding} className="text-sm font-medium text-primary hover:underline">
            Add a material
          </button>
        ) : undefined
      }
    >
      {materials.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing used yet. Add the cloth, lining, zips, buttons and thread you use.</p>
      ) : (
        <ul className="divide-y divide-gray-100 text-sm">
          {materials.map((m) => (
            <li key={m._id} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="font-medium text-gray-900">
                  {m.quantity} × {m.name}
                </span>
                <span className="block text-xs text-gray-400">
                  {m.product ? 'From stock' : 'Not from stock'}
                  {isOwner && m.cost > 0 ? ` · cost ${formatMoney(m.cost)} each` : ''}
                  {m.addedByName ? ` · ${m.addedByName}` : ''}
                </span>
              </span>
              {canWrite && open && (
                <button type="button" disabled={busy} onClick={() => act(() => removeTailorMaterial(order._id, m._id), m.product ? 'Material removed and put back in stock' : 'Material removed')} className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isOwner && materials.length > 0 && (
        <p className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">Cost of materials (only you see this)</span>
          <span className="font-medium text-gray-900">{formatMoney(order.materialsCost || 0)}</span>
        </p>
      )}

      {adding && (
        <form onSubmit={submit} className="mt-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Where the material comes from">
            {[
              { value: 'stock', label: 'From my stock' },
              { value: 'other', label: 'Not in stock' },
            ].map((o) => (
              <button key={o.value} type="button" onClick={() => setMode(o.value)} aria-pressed={mode === o.value} className={`rounded-lg px-3 py-1.5 text-sm transition ${mode === o.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {o.label}
              </button>
            ))}
          </div>

          {mode === 'stock' ? (
            <>
              {loadError && <p className="text-sm text-red-600">{loadError}</p>}
              <Field label="Item" hint="Using an item takes it out of your stock.">
                <select value={productId} onChange={(e) => { setProductId(e.target.value); setVariantId(''); }} className={inputClass}>
                  <option value="">{products === null ? 'Loading…' : 'Select an item'}</option>
                  {(products || []).map((p) => (
                    <option key={p._id} value={p._id} disabled={p.quantity <= 0}>
                      {p.name} — {p.quantity <= 0 ? 'out of stock' : `${p.quantity} in stock`}
                    </option>
                  ))}
                </select>
              </Field>
              {variants.length > 0 && (
                <Field label="Colour / size">
                  <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={inputClass}>
                    <option value="">Select one</option>
                    {variants.map((v) => (
                      <option key={v._id} value={v._id} disabled={v.quantity <= 0}>
                        {variantLabel(v)} — {v.quantity <= 0 ? 'out of stock' : `${v.quantity} in stock`}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Material">
                <input type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Lace, 5 yards" />
              </Field>
              {isOwner && (
                <Field label="What it cost you, each (₦)">
                  <input type="number" min="0" step="any" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
                </Field>
              )}
            </div>
          )}

          <Field label="Quantity">
            <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputClass} sm:max-w-[10rem]`} />
          </Field>

          {problem && <p className="text-sm text-red-600">{problem}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? 'Saving…' : 'Add material'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}
