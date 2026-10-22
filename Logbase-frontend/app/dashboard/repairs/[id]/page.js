'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  addRepairPart,
  addRepairPayment,
  deleteRepair,
  getRepair,
  listProducts,
  removeRepairPart,
  setRepairStatus,
  updateRepair,
} from '@/lib/api';
import { formatDate, formatDateTime, formatMoney, variantLabel } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { REPAIR_STATUSES, dayInputValue } from '@/lib/jobs';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { forShop } from '@/lib/shopStorage';
import { Detail, DetailCard, DetailGrid, MoneyStrip } from '@/components/DetailParts';
import {
  HistoryList,
  JobStatusBadge,
  PaymentForm,
  PaymentsList,
  SectionCard,
  StatusButtons,
} from '@/components/JobParts';
import { ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

export default function RepairDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { can, isOwner } = useUser();
  const canWrite = can('recordSales');

  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // set when someone tries to hand over a job that has no price and no money: they must confirm it is free of charge
  const [askFree, setAskFree] = useState(false);

  useEffect(() => {
    getRepair(id)
      .then((data) => setRepair(data.repair))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Runs one change on the job. `work` returns the promise of the server's answer ({ repair }).
  const act = useCallback(async (work, message) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const data = await work();
      if (data && data.repair) setRepair(data.repair);
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
  if (!repair) {
    return (
      <>
        <PageHeader title="Repair job not found" backHref="/dashboard/repairs" backLabel="Back to repairs" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const open = repair.status !== 'collected';
  const phone = describePhone(repair.customerPhone);
  const hasMoney = repair.payments && repair.payments.length > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${repair.code} · ${repair.device}`}
        subtitle={`${repair.customerName} · taken in ${formatDate(repair.receivedAt)}`}
        backHref="/dashboard/repairs"
        backLabel="Back to repairs"
        action={
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/repairs/${repair._id}/slip`} className={secondaryButtonClass}>
              Job slip
            </Link>
            <JobStatusBadge statuses={REPAIR_STATUSES} value={repair.status} />
          </div>
        }
      />

      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {/* where the job is */}
      <SectionCard title="Progress">
        {canWrite && open ? (
          <>
            <StatusButtons
              statuses={REPAIR_STATUSES}
              current={repair.status}
              busy={busy}
              onChange={(status) => {
                setAskFree(false);
                if (status === 'collected' && !(repair.quote > 0) && !(repair.amountPaid > 0)) {
                  setAskFree(true); // no price and no money: ask before handing it over
                  return;
                }
                act(() => setRepairStatus(repair._id, status), `Marked "${REPAIR_STATUSES.find((s) => s.value === status).label}"`);
              }}
            />
            {askFree && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>This job has no price and nothing has been paid. Hand the device over free of charge?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await act(() => setRepairStatus(repair._id, 'collected', undefined, { free: true }), 'Marked "Collected"');
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
            {repair.balance > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                The customer still owes {formatMoney(repair.balance)}. Record their payment below before you hand over the device.
              </p>
            )}
            {repair.balance < 0 && <p className="mt-3 text-xs text-amber-700">Set the price of the job (edit the details) before you hand over the device.</p>}
          </>
        ) : (
          <p className="text-sm text-gray-600">
            {open ? 'You can look at this job but not change it.' : `Collected on ${formatDateTime(repair.collectedAt)}. A collected job is final.`}
          </p>
        )}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <HistoryList history={repair.history} statuses={REPAIR_STATUSES} />
        </div>
      </SectionCard>

      {/* the job itself */}
      <DetailCard
        title="Details"
        icon="wrench"
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
            repair={repair}
            busy={busy}
            onCancel={() => setEditing(false)}
            onSave={async (payload) => {
              const ok = await act(() => updateRepair(repair._id, payload), 'Job updated');
              if (ok) setEditing(false);
            }}
          />
        ) : (
          <>
            <MoneyStrip
              items={[
                repair.quote > 0
                  ? { label: 'Quote', value: formatMoney(repair.quote), tone: 'brand' }
                  : { label: 'Quote', value: 'Not set yet', tone: 'plain' },
                { label: 'Paid so far', value: formatMoney(repair.amountPaid), tone: 'good' },
                repair.quote > 0
                  ? repair.balance > 0
                    ? { label: 'Balance', value: formatMoney(repair.balance), tone: 'bad' }
                    : { label: 'Balance', value: formatMoney(0), tone: 'good', note: 'Paid in full' }
                  : { label: 'Balance', value: '—', tone: 'plain' },
              ]}
            />
            <DetailGrid>
              <Detail label="Customer" icon="user" color="sky">{repair.customerName}</Detail>
              <Detail label="Phone number" icon="phone" color="sky">{phone.display}</Detail>
              <Detail label="Technician" icon="wrench" color="violet">{repair.technician}</Detail>
              <Detail label="Device" icon="phone" color="teal">{repair.device}</Detail>
              <Detail label="IMEI / serial" icon="hash" color="teal" mono>{repair.imei}</Detail>
              <Detail label="Left with the device" icon="archive" color="amber">{repair.accessories}</Detail>
              <Detail label="Fault" icon="alert" color="red" wide>{repair.fault}</Detail>
              <Detail label="Promised for" icon="calendar" color="violet">{repair.promisedDate ? formatDate(repair.promisedDate) : ''}</Detail>
              {repair.readyAt && <Detail label="Ready since" icon="check" color="green">{formatDateTime(repair.readyAt)}</Detail>}
              <Detail label="Taken in by" icon="user" color="sky">{repair.recordedByName}</Detail>
              {repair.notes && <Detail label="Notes" icon="note" color="amber" wide>{repair.notes}</Detail>}
            </DetailGrid>
          </>
        )}
      </DetailCard>

      {/* spare parts used */}
      <PartsCard repair={repair} open={open} canWrite={canWrite} isOwner={isOwner} busy={busy} act={act} />

      {/* money */}
      <SectionCard title="Payments">
        <PaymentsList payments={repair.payments} />
        {canWrite && open && (repair.balance > 0 || repair.quote <= 0) && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Take a payment</p>
            <PaymentForm
              balance={repair.balance > 0 ? repair.balance : 0}
              busy={busy}
              onSubmit={(payload) => act(() => addRepairPayment(repair._id, payload), 'Payment recorded')}
            />
          </div>
        )}
      </SectionCard>

      {/* a job entered by mistake */}
      {isOwner && open && !hasMoney && (
        <div className={`${cardClass} p-6`}>
          <h2 className="mb-1 text-lg font-medium text-gray-900">Entered by mistake?</h2>
          <p className="mb-4 text-xs text-gray-400">Only possible before any money is taken. Spare parts on the job go back into stock.</p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">Delete this job for good?</span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await deleteRepair(repair._id);
                    router.push('/dashboard/repairs');
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
              Delete this job
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditForm({ repair, busy, onSave, onCancel }) {
  const [device, setDevice] = useState(repair.device || '');
  const [imei, setImei] = useState(repair.imei || '');
  const [accessories, setAccessories] = useState(repair.accessories || '');
  const [fault, setFault] = useState(repair.fault || '');
  const [quote, setQuote] = useState(repair.quote > 0 ? String(repair.quote) : '');
  const [technician, setTechnician] = useState(repair.technician || '');
  const [promised, setPromised] = useState(repair.promisedDate ? dayInputValue(repair.promisedDate) : '');
  const [notes, setNotes] = useState(repair.notes || '');
  const [problem, setProblem] = useState('');

  function submit(e) {
    e.preventDefault();
    setProblem('');
    if (!device.trim()) return setProblem('The device cannot be empty');
    if (!fault.trim()) return setProblem('The fault cannot be empty');
    const q = Number(quote) || 0;
    const payload = { device, imei, accessories, fault, technician, promisedDate: promised, notes };
    // the quote is only sent when it was changed (a job with a deposit and no price yet can still have its other details edited)
    if (q !== (repair.quote || 0)) {
      if (q < repair.amountPaid) return setProblem(`The customer has already paid ${formatMoney(repair.amountPaid)}, so the quote cannot be lower than that.`);
      payload.quote = q;
    }
    onSave(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Device">
          <input type="text" maxLength={100} value={device} onChange={(e) => setDevice(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="IMEI / serial">
          <input type="text" maxLength={40} value={imei} onChange={(e) => setImei(e.target.value)} className={`${inputClass} font-mono`} />
        </Field>
      </div>
      <Field label="Left with the device">
        <input type="text" maxLength={200} value={accessories} onChange={(e) => setAccessories(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Fault">
        <textarea rows={3} maxLength={500} value={fault} onChange={(e) => setFault(e.target.value)} className={inputClass} required />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Quote (₦)" hint={repair.amountPaid > 0 ? `At least ${formatMoney(repair.amountPaid)} (already paid)` : undefined}>
          <input type="number" min="0" step="any" value={quote} onChange={(e) => setQuote(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Technician">
          <input type="text" maxLength={80} value={technician} onChange={(e) => setTechnician(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Promised date">
          <input type="date" value={promised} onChange={(e) => setPromised(e.target.value)} className={inputClass} />
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

function PartsCard({ repair, open, canWrite, isOwner, busy, act }) {
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

  const parts = repair.parts || [];
  const showCost = isOwner;

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
    const qty = Math.floor(Number(quantity));
    if (!(qty >= 1)) return setProblem('Enter a quantity of 1 or more');
    let payload;
    if (mode === 'stock') {
      if (!product) return setProblem('Choose the part from your stock');
      if (variants.length > 0 && !variant) return setProblem(`Choose the colour / size of ${product.name}`);
      payload = { product: product._id, quantity: qty };
      if (variant) payload.variant = variant._id;
    } else {
      if (!name.trim()) return setProblem('Enter the name of the part');
      payload = { name: name.trim(), quantity: qty };
      if (showCost && cost !== '') payload.cost = Number(cost);
    }
    const ok = await act(() => addRepairPart(repair._id, payload), 'Part added to the job');
    if (ok) {
      setAdding(false);
      setProductId('');
      setVariantId('');
      setQuantity('1');
      setName('');
      setCost('');
      // the stock changed, so the list is read again the next time
      setProducts(null);
    }
  }

  return (
    <SectionCard
      title="Spare parts used"
      action={
        canWrite && open && !adding ? (
          <button type="button" onClick={startAdding} className="text-sm font-medium text-primary hover:underline">
            Add a part
          </button>
        ) : undefined
      }
    >
      {parts.length === 0 ? (
        <p className="text-sm text-gray-400">No parts used yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 text-sm">
          {parts.map((p) => (
            <li key={p._id} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="font-medium text-gray-900">
                  {p.quantity} × {p.name}
                </span>
                <span className="block text-xs text-gray-400">
                  {p.product ? 'From stock' : 'Not from stock'}
                  {showCost && p.cost > 0 ? ` · cost ${formatMoney(p.cost)} each` : ''}
                  {p.addedByName ? ` · ${p.addedByName}` : ''}
                </span>
              </span>
              {canWrite && open && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => removeRepairPart(repair._id, p._id), p.product ? 'Part removed and put back in stock' : 'Part removed')}
                  className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {showCost && parts.length > 0 && (
        <p className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">Cost of parts (only you see this)</span>
          <span className="font-medium text-gray-900">{formatMoney(repair.partsCost)}</span>
        </p>
      )}

      {adding && (
        <form onSubmit={submit} className="mt-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Where the part comes from">
            {[
              { value: 'stock', label: 'From my stock' },
              { value: 'other', label: 'Not in stock' },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setMode(o.value)}
                aria-pressed={mode === o.value}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${mode === o.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {mode === 'stock' ? (
            <>
              {loadError && <p className="text-sm text-red-600">{loadError}</p>}
              <Field label="Spare part" hint="Using a part takes it out of your stock.">
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setVariantId('');
                  }}
                  className={inputClass}
                >
                  <option value="">{products === null ? 'Loading…' : 'Select a part'}</option>
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
              <Field label="Part">
                <input type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </Field>
              {showCost && (
                <Field label="What it cost you, each (₦)">
                  <input type="number" min="0" step="any" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
                </Field>
              )}
            </div>
          )}

          <Field label="Quantity">
            <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputClass} sm:max-w-[10rem]`} />
          </Field>

          {problem && <p className="text-sm text-red-600">{problem}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? 'Saving…' : 'Add part'}
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
