'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { assignPurchaseSupplier, getPurchase, listSuppliers } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { purchasePayment } from '@/lib/payables';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import PhotoGrid from '@/components/PhotoGrid';
import { ErrorBanner, Field, LoadingState, StatusBadge, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900">{children || '—'}</dd>
    </div>
  );
}

// A purchase a staff recorded has no supplier. The administrator picks one here and says what was paid for the goods:
// paid in full, or only part of it, and the rest is added to what is owed to that supplier.
function AddSupplier({ id, total, onDone }) {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [paidInFull, setPaidInFull] = useState(true);
  const [amountPaid, setAmountPaid] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listSuppliers()
      .then((data) => setSuppliers(data.suppliers || []))
      .catch((err) => setError(err.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!supplierId) {
      setError('Choose the supplier');
      return;
    }
    const paid = Number(amountPaid);
    if (!paidInFull) {
      if (amountPaid === '' || !Number.isFinite(paid) || paid < 0) {
        setError('Enter how much you paid (0 if you paid nothing), or choose "Paid in full"');
        return;
      }
      if (paid >= total) {
        setError('That is the full price. Choose "Paid in full", or enter less than the total.');
        return;
      }
    }
    setSaving(true);
    try {
      await assignPurchaseSupplier(id, { supplier: supplierId, ...(paidInFull ? {} : { amountPaid: paid }) });
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div>
        <h2 className="text-base font-medium text-amber-900">Add the supplier</h2>
        <p className="mt-0.5 text-xs text-amber-800">This purchase was recorded without a supplier. Add it here, once.</p>
      </div>
      <ErrorBanner message={error} />
      <Field label="Supplier">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass} aria-label="Supplier">
          <option value="">Select a supplier</option>
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <p className="-mt-2 text-xs text-gray-500">
        Not in the list? <Link href="/dashboard/suppliers/new" className="font-medium text-primary hover:underline">Add a new supplier</Link>, then come back.
      </p>
      <Field label={`Did you pay ${formatMoney(total)} for these goods?`}>
        <select
          value={paidInFull ? 'full' : 'credit'}
          onChange={(e) => setPaidInFull(e.target.value === 'full')}
          className={inputClass}
          aria-label="Payment"
        >
          <option value="full">Yes, paid in full</option>
          <option value="credit">No, on credit (or only part paid)</option>
        </select>
      </Field>
      {!paidInFull && (
        <Field label="Amount you paid (₦)" hint="Enter 0 if you paid nothing yet. The rest is added to what you owe this supplier.">
          <input type="number" min="0" step="any" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className={inputClass} />
        </Field>
      )}
      <button type="submit" disabled={saving} className={primaryButtonClass}>
        {saving ? 'Saving…' : 'Add supplier'}
      </button>
    </form>
  );
}

// A recorded purchase is final, so this page only shows it. Nothing here can be edited.
export default function PurchaseDetailPage() {
  const { id } = useParams();
  const { isOwner } = useUser(); // costs are for the owner only
  const [purchase, setPurchase] = useState(null);
  const [group, setGroup] = useState([]); // every line of the same purchase, oldest first
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return getPurchase(id).then((data) => {
      setPurchase(data.purchase);
      setGroup(data.group || []);
    });
  }, [id]);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <LoadingState />;

  if (!purchase) {
    return (
      <>
        <PageHeader title="Purchase not found" backHref="/dashboard/purchases" backLabel="Back to purchases" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const supplierPhone = describePhone(purchase.supplier?.phone);
  const isGroup = group.length > 1;
  // Photos added while the purchase was recorded (kept on the first line when there are several items).
  const photos = (isGroup ? group : [purchase]).flatMap((line) => line.images || []);
  const groupTotal = (isGroup ? group : [purchase]).reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0);
  // the delivery fee is kept on the first line of a multi-item purchase
  const deliveryCost = (isGroup ? group : [purchase]).reduce(
    (sum, l) => sum + (l.deliveryPaidByUs ? Number(l.deliveryCost) || 0 : 0),
    0
  );

  // buying on credit: what was handed over on the day and what was left owed (both kept on the first line)
  const lines = isGroup ? group : [purchase];
  const onCredit = lines.some((l) => l.onCredit);
  const paidToday = lines.reduce((sum, l) => sum + (Number(l.amountPaid) || 0), 0);
  const stillOwed = lines.reduce((sum, l) => sum + (Number(l.creditAmount) || 0), 0);
  // a purchase a staff recorded has no supplier yet (only the administrator is told)
  const hasSupplier = lines.some((l) => l.supplierName || l.supplier);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={purchase.product?.name || 'Purchase'}
        subtitle={[purchase.variantLabel, formatDateTime(purchase.date || purchase.createdAt)].filter(Boolean).join(' · ')}
        backHref="/dashboard/purchases"
        backLabel="Back to purchases"
      />

      <ErrorBanner message={error} />

      {isOwner && !hasSupplier && <AddSupplier id={id} total={groupTotal} onDone={load} />}

      {isGroup && (
        <div className={`${cardClass} mb-6 p-6`}>
          <h2 className="mb-1 text-lg font-medium text-gray-900">Everything in this purchase</h2>
          <p className="mb-4 text-xs text-gray-400">{group.length} items were received at the same time.</p>
          <ul className="divide-y divide-gray-100">
            {group.map((line) => (
              <li key={line._id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className={line._id === purchase._id ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                  {line._id === purchase._id ? (
                    <>{line.product?.name || 'Product'}{line.variantLabel ? ` · ${line.variantLabel}` : ''}</>
                  ) : (
                    <Link href={`/dashboard/purchases/${line._id}`} className="hover:text-primary hover:underline">
                      {line.product?.name || 'Product'}{line.variantLabel ? ` · ${line.variantLabel}` : ''}
                    </Link>
                  )}
                  <span className="ml-2 text-gray-400">
                    {isOwner ? `${line.quantity} × ${formatMoney(line.costPricePerUnit)}` : `${line.quantity} units`}
                  </span>
                </span>
                {isOwner && <span className="font-medium text-gray-900">{formatMoney(line.totalCost)}</span>}
              </li>
            ))}
          </ul>
          {isOwner && (
            <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-sm">
              <span className="text-gray-500">Total for the whole purchase</span>
              <span className="font-semibold text-gray-900">{formatMoney(groupTotal)}</span>
            </div>
          )}
        </div>
      )}

      <div className={`${cardClass} mb-6 p-6`}>
        <h2 className="mb-4 text-lg font-medium text-gray-900">Details</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Detail label="Quantity">{purchase.quantity}</Detail>
          {isOwner && <Detail label="Cost per unit">{formatMoney(purchase.costPricePerUnit)}</Detail>}
          {isOwner && <Detail label="Total cost">{formatMoney(purchase.totalCost)}</Detail>}
          {isOwner && (
            <Detail label="Delivery">{deliveryCost > 0 ? `You paid ${formatMoney(deliveryCost)}` : 'Not paid by you'}</Detail>
          )}
          {isOwner && hasSupplier && (
            <Detail label="Payment">
              {onCredit ? (
                <>
                  <span className="mr-2 align-middle"><StatusBadge status={purchasePayment({ onCredit, amountPaid: paidToday }).status} /></span>
                  Paid {formatMoney(paidToday)} on the day, {formatMoney(stillOwed)} was left owed
                </>
              ) : (
                'Paid in full'
              )}
            </Detail>
          )}
          <Detail label="Batch number">{purchase.batchNumber}</Detail>
          <Detail label="Purchased by">{purchase.purchasedBy}</Detail>
          <Detail label="Recorded">{formatDateTime(purchase.createdAt)}</Detail>
        </dl>

        {/* who the goods came from is for the administrator only */}
        {isOwner && hasSupplier && (
          <>
            <h3 className="mb-3 mt-6 border-t border-gray-100 pt-5 text-sm font-semibold text-gray-900">Supplier</h3>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Detail label="Name">{purchase.supplierName || purchase.supplier?.name}</Detail>
              <Detail label="Country">{supplierPhone.country}</Detail>
              <Detail label="Phone number">{supplierPhone.display}</Detail>
              <Detail label="Email">{purchase.supplier?.email}</Detail>
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs text-gray-400">Address</dt>
                <dd className="text-sm text-gray-900">{purchase.supplier?.address || '—'}</dd>
              </div>
            </dl>
          </>
        )}
      </div>

      {(isGroup ? group : [purchase]).some((l) => (l.serials || []).length > 0) && (
        <div className={`${cardClass} mb-6 p-6`}>
          <h2 className="mb-1 text-lg font-medium text-gray-900">IMEI / serial numbers received</h2>
          <p className="mb-4 text-xs text-gray-400">Tap a number to see where that unit is now.</p>
          <ul className="divide-y divide-gray-100">
            {(isGroup ? group : [purchase])
              .filter((l) => (l.serials || []).length > 0)
              .map((line) => (
                <li key={line._id} className="py-3 text-sm">
                  <p className="font-medium text-gray-900">
                    {line.product?.name || 'Product'}
                    {line.variantLabel ? ` · ${line.variantLabel}` : ''}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {line.serials.map((serial) => (
                      <li key={serial}>
                        <Link
                          href={`/dashboard/serials?q=${encodeURIComponent(serial)}`}
                          className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800 hover:bg-gray-200"
                        >
                          {serial}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <div className={`${cardClass} p-6`}>
          <h2 className="mb-4 text-lg font-medium text-gray-900">Purchase photos</h2>
          <PhotoGrid images={photos} alt="Purchase" />
        </div>
      )}
    </div>
  );
}
