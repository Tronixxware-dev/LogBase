'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupplier, recordSupplierPayment } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { purchasePayment } from '@/lib/payables';
import { describePhone } from '@/lib/phone';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { ErrorBanner, Field, LoadingState, StatusBadge, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

const columns = [
  { key: 'product', label: 'Product', render: (p) => (
      <span className="font-medium text-gray-900">
        {p.product?.name || '—'}
        {p.variantLabel && <span className="block text-xs font-normal text-gray-400">{p.variantLabel}</span>}
      </span>
    ),
  },
  { key: 'date', label: 'Date & time', render: (p) => formatDateTime(p.date || p.createdAt) },
  { key: 'purchasedBy', label: 'Purchased by', render: (p) => p.purchasedBy || '—' },
  { key: 'quantity', label: 'Qty' },
  { key: 'costPricePerUnit', label: 'Cost / unit', render: (p) => formatMoney(p.costPricePerUnit) },
  { key: 'totalCost', label: 'Total', render: (p) => formatMoney(p.totalCost) },
  { key: 'payment', label: 'Payment', render: (p) => <StatusBadge status={purchasePayment(p).status} /> },
];

const paymentColumns = [
  { key: 'amount', label: 'Amount', render: (p) => <span className="font-medium text-gray-900">{formatMoney(p.amount)}</span> },
  { key: 'date', label: 'Date', render: (p) => formatDate(p.date || p.createdAt) },
  { key: 'note', label: 'Note' },
];

// the cost and payment columns are only for the owner
const COST_KEYS = ['costPricePerUnit', 'totalCost', 'payment'];

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900">{value || '—'}</dd>
    </div>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isOwner } = useUser();
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return getSupplier(id).then((data) => {
      setSupplier(data.supplier);
      setPurchases(data.purchases || []);
      setPayments(data.payments || []);
    });
  }, [id]);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  async function handlePay(e) {
    e.preventDefault();
    setError('');
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError('Enter how much you paid');
      return;
    }
    if (value > Number(supplier.balance) + 0.005) {
      setError(`You only owe ${formatMoney(supplier.balance)}. Enter that or less.`);
      return;
    }
    setSaving(true);
    try {
      await recordSupplierPayment(id, { amount: value, note: note.trim() || undefined });
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  if (!supplier) {
    return (
      <>
        <PageHeader title="Supplier not found" backHref="/dashboard/suppliers" backLabel="Back to suppliers" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const phone = describePhone(supplier.phone);
  const owed = Math.max(Number(supplier.balance) || 0, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={supplier.name}
        subtitle={[phone.display, supplier.address].filter(Boolean).join(' · ') || 'No phone or address on file'}
        backHref="/dashboard/suppliers"
        backLabel="Back to suppliers"
        action={
          isOwner ? (
            <div className="text-right">
              <p className="text-sm text-gray-500">You owe</p>
              <p className={`text-2xl font-semibold ${owed > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatMoney(owed)}</p>
              <Link href={`/dashboard/suppliers/${id}/statement`} className="text-sm font-medium text-primary hover:underline">
                View statement
              </Link>
            </div>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {isOwner && owed > 0 && (
        <form onSubmit={handlePay} className={`${cardClass} mb-8 flex flex-wrap items-end gap-3 p-5`}>
          <div className="w-full sm:w-44">
            <Field label="Payment to supplier (₦)">
              <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="min-w-[160px] flex-1">
            <Field label="Note (optional)">
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Recording…' : 'Record payment'}
          </button>
          <button
            type="button"
            onClick={() => setAmount(String(owed))}
            className="text-sm font-medium text-primary hover:underline"
          >
            Pay everything ({formatMoney(owed)})
          </button>
        </form>
      )}

      <div className={`${cardClass} mb-8 p-6`}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Country" value={phone.country} />
          <Detail label="Phone number" value={phone.display} />
          <Detail label="Email" value={supplier.email} />
          <Detail label="Address" value={supplier.address} />
          <Detail label="Notes" value={supplier.notes} />
        </dl>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        Purchase history <span className="text-sm font-normal text-gray-400">({purchases.length} total)</span>
      </h2>
      {purchases.length === 0 ? (
        <p className="text-sm text-gray-500">No purchases recorded from this supplier yet.</p>
      ) : (
        <DataTable
          columns={isOwner ? columns : columns.filter((c) => !COST_KEYS.includes(c.key))}
          rows={purchases}
          onRowClick={(p) => router.push(`/dashboard/purchases/${p._id}`)}
        />
      )}

      {isOwner && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900">
            Payments to this supplier <span className="text-sm font-normal text-gray-400">({payments.length} total)</span>
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">You have not recorded any payments to this supplier yet.</p>
          ) : (
            <DataTable columns={paymentColumns} rows={payments} />
          )}
        </>
      )}
    </div>
  );
}
