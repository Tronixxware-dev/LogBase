'use client';

import { notifySuccess } from '@/lib/feedback';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getCustomer, recordCustomerPayment } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { PersonChip } from '@/components/Avatar';
import {
  ErrorBanner,
  Field,
  LoadingState,
  StatusBadge,
  cardClass,
  inputClass,
  primaryButtonClass,
} from '@/components/ui';

const salesColumns = [
  { key: 'product', label: 'Product', render: (s) => (
      <span className="font-medium text-gray-900">
        {s.product?.name || '—'}
        {s.variantLabel && <span className="block text-xs font-normal text-gray-400">{s.variantLabel}</span>}
      </span>
    ),
  },
  { key: 'date', label: 'Date & time', render: (s) => formatDateTime(s.date || s.createdAt) },
  { key: 'sellerName', label: 'Sold by', render: (s) => <PersonChip name={s.sellerName} photoUrl={s.sellerPhotoUrl} /> },
  { key: 'quantity', label: 'Qty' },
  { key: 'totalAmount', label: 'Total', render: (s) => formatMoney(s.totalAmount) },
  { key: 'paymentStatus', label: 'Status', render: (s) => <StatusBadge status={s.paymentStatus} /> },
];

const paymentColumns = [
  { key: 'amount', label: 'Amount', render: (p) => <span className="font-medium text-gray-900">{formatMoney(p.amount)}</span> },
  { key: 'date', label: 'Date', render: (p) => formatDate(p.date || p.createdAt) },
  { key: 'note', label: 'Note' },
];

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { can } = useUser();
  const isManager = can('manageCustomers'); // sees what the customer owes and their history, and can record payments
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return getCustomer(id).then((data) => {
      setCustomer(data.customer);
      setSales(data.sales || []);
      setPayments(data.payments || []);
    });
  }, [id]);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleRecordPayment(e) {
    e.preventDefault();
    setError('');

    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid payment amount');
      return;
    }

    setSaving(true);
    try {
      await recordCustomerPayment(id, { amount: Number(amount), note });
      notifySuccess('Payment recorded', formatMoney(Number(amount)));
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

  if (!customer) {
    return (
      <>
        <PageHeader title="Customer not found" backHref="/dashboard/customers" backLabel="Back to customers" />
        <ErrorBanner message={error} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={customer.name}
        subtitle={[customer.phone, customer.address].filter(Boolean).join(' · ') || 'No phone or address on file'}
        backHref="/dashboard/customers"
        backLabel="Back to customers"
        action={
          isManager ? (
            <div className="text-right">
              <p className="text-sm text-gray-500">{customer.balance < 0 ? 'Store credit' : 'Balance owed'}</p>
              <p
                className={`text-2xl font-semibold ${
                  customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-teal-700' : 'text-gray-900'
                }`}
              >
                {formatMoney(Math.abs(customer.balance))}
              </p>
              <Link href={`/dashboard/customers/${id}/statement`} className="text-sm font-medium text-primary hover:underline">
                View statement
              </Link>
            </div>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {customer.email && !isManager && <p className="mb-6 text-sm text-gray-500">{customer.email}</p>}

      {isManager && customer.balance > 0 && (
        <form
          onSubmit={handleRecordPayment}
          className={`${cardClass} mb-8 flex flex-wrap items-end gap-3 p-5`}
        >
          <div className="w-full sm:w-40">
            <Field label="Payment amount (₦)">
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="min-w-[160px] flex-1">
            <Field label="Note (optional)">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Recording…' : 'Record payment'}
          </button>
        </form>
      )}

      {/* purchase and payment history need the "Manage customers" permission */}
      {isManager && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Purchase history <span className="text-sm font-normal text-gray-400">({sales.length} total)</span>
          </h2>
          {sales.length === 0 ? (
            <p className="mb-8 text-sm text-gray-500">No sales recorded for this customer yet.</p>
          ) : (
            <div className="mb-8">
              <DataTable columns={salesColumns} rows={sales} />
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Payment history <span className="text-sm font-normal text-gray-400">({payments.length} total)</span>
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <DataTable columns={paymentColumns} rows={payments} />
          )}
        </>
      )}
    </div>
  );
}
