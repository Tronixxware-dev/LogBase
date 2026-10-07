'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSale } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { buildReceipt, receiptText, whatsappLink } from '@/lib/receipt';
import { useUser } from '@/components/UserProvider';
import { ErrorBanner, LoadingState, cardClass } from '@/components/ui';

// A receipt for one sale: print it (or save it as a PDF from the print window) or send it on WhatsApp.
export default function ReceiptPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [sale, setSale] = useState(null);
  const [group, setGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getSale(id)
      .then((data) => {
        setSale(data.sale);
        setGroup(data.group || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const businessName = user?.businessName || 'Receipt';
  const receipt = useMemo(() => (sale ? buildReceipt({ sale, lines: group.length > 1 ? group : [sale] }) : null), [sale, group]);

  if (loading) return <LoadingState />;
  if (!receipt) {
    return (
      <>
        <Link href="/dashboard/sales" className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
          ← Back to sales
        </Link>
        <ErrorBanner message={error || 'Sale not found'} />
      </>
    );
  }

  const text = receiptText(receipt, businessName);
  const phone = describePhone(receipt.customerPhone);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the receipt and copy it by hand.');
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/dashboard/sales/${id}`} className="mr-auto text-sm text-gray-500 hover:text-primary">
          ← Back to sale
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Print / Save as PDF
        </button>
        <a
          href={whatsappLink(receipt.customerPhone, text)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>
      <div className="print:hidden">
        <ErrorBanner message={error} />
      </div>

      <article className={`${cardClass} p-6 text-sm text-gray-800 print:rounded-none print:border-0 print:p-0`} data-receipt>
        <header className="border-b border-dashed border-gray-300 pb-4 text-center">
          <h1 className="text-xl font-semibold text-gray-900">{businessName}</h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Receipt #{receipt.number}</p>
          <p className="text-xs text-gray-500">{formatDate(receipt.date)}</p>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-dashed border-gray-300 py-4 text-xs">
          <dt className="text-gray-500">Customer</dt>
          <dd className="text-right text-gray-900">{receipt.customerName}</dd>
          {phone.display && (
            <>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-right text-gray-900">{phone.display}</dd>
            </>
          )}
          {receipt.servedBy && (
            <>
              <dt className="text-gray-500">Served by</dt>
              <dd className="text-right text-gray-900">{receipt.servedBy}</dd>
            </>
          )}
          {receipt.paymentMethod && (
            <>
              <dt className="text-gray-500">Payment</dt>
              <dd className="text-right capitalize text-gray-900">{receipt.paymentMethod}</dd>
            </>
          )}
        </dl>

        <table className="mt-4 w-full text-left">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-1 pr-2 text-gray-900">
                  {item.name}
                  {item.serials.length > 0 && (
                    <span className="block break-all font-mono text-[11px] text-gray-500">IMEI / serial: {item.serials.join(', ')}</span>
                  )}
                  {item.warrantyEndsAt && (
                    <span className="block text-xs text-gray-500">Warranty until {formatDate(item.warrantyEndsAt)}</span>
                  )}
                  {item.returnedQuantity > 0 && (
                    <span className="block text-xs text-gray-500">
                      Returned {item.returnedQuantity}: −{formatMoney(item.returnedAmount)}
                    </span>
                  )}
                </td>
                <td className="py-1 text-right">{item.quantity}</td>
                <td className="py-1 text-right">{formatMoney(item.unitPrice)}</td>
                <td className="py-1 text-right">{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t border-dashed border-gray-300 pt-4">
          {receipt.returned > 0 && (
            <>
              <p className="flex justify-between text-gray-600">
                <span>Items sold</span>
                <span>{formatMoney(receipt.subtotal)}</span>
              </p>
              <p className="flex justify-between text-gray-600">
                <span>Returned</span>
                <span>−{formatMoney(receipt.returned)}</span>
              </p>
            </>
          )}
          <p className="flex justify-between text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatMoney(receipt.total)}</span>
          </p>
          <p className="flex justify-between text-gray-600">
            <span>Paid</span>
            <span>{formatMoney(receipt.paid)}</span>
          </p>
          {receipt.balance > 0 && (
            <p className="flex justify-between font-semibold text-red-600">
              <span>Still owed</span>
              <span>{formatMoney(receipt.balance)}</span>
            </p>
          )}
        </div>

        {receipt.hasWarranty && (
          <p className="mt-6 text-center text-xs text-gray-500">Keep this receipt: it is your proof of purchase for the warranty.</p>
        )}
        <p className={`${receipt.hasWarranty ? 'mt-2' : 'mt-6'} text-center text-xs text-gray-400`}>Thank you for your business!</p>
      </article>
    </div>
  );
}
