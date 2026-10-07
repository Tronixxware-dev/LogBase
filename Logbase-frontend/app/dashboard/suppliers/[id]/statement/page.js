'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSupplierStatement } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import { ErrorBanner, LoadingState, cardClass } from '@/components/ui';

const TYPE_LABEL = { purchase: 'Purchase', payment: 'Payment', opening: 'Earlier' };

// The account with a supplier: every purchase and payment, with what is owed after each one.
// Administrator only. Print it, or save it as a PDF from the print window.
export default function SupplierStatementPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSupplierStatement(id)
      .then(setStatement)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const businessName = user?.businessName || 'Statement';

  if (loading) return <LoadingState />;
  if (!statement) {
    return (
      <>
        <Link href={`/dashboard/suppliers/${id}`} className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
          ← Back to supplier
        </Link>
        <ErrorBanner message={error || 'Supplier not found'} />
      </>
    );
  }

  const { supplier, entries, balance, totals } = statement;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/dashboard/suppliers/${id}`} className="mr-auto text-sm text-gray-500 hover:text-primary">
          ← Back to supplier
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Print / Save as PDF
        </button>
      </div>

      <article className={`${cardClass} p-6 print:rounded-none print:border-0 print:p-0`} data-statement>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{businessName}</h1>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Supplier account statement</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-gray-900">{supplier.name}</p>
            {supplier.phone && <p className="text-gray-500">{supplier.phone}</p>}
            {supplier.address && <p className="text-gray-500">{supplier.address}</p>}
            <p className="mt-1 text-xs text-gray-400">As at {formatDate(new Date())}</p>
          </div>
        </header>

        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Nothing on this account yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Details</th>
                  <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">Goods</th>
                  <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">Paid</th>
                  <th className="pb-2 text-right font-medium">You owe</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.type}-${e.id || i}-${i}`} className="border-b border-gray-100 align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-gray-500">{e.date ? formatDate(e.date) : '—'}</td>
                    <td className="py-2 pr-3 text-gray-900">
                      <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{TYPE_LABEL[e.type] || e.type}</span>
                      {e.type === 'purchase' ? (
                        <Link href={`/dashboard/purchases/${e.id}`} className="hover:underline print:no-underline">
                          {e.label}
                        </Link>
                      ) : (
                        e.label
                      )}
                      <span className="mt-1 block text-xs text-gray-500 sm:hidden">
                        {e.debit > 0 && <>Goods {formatMoney(e.debit)}</>}
                        {e.debit > 0 && e.credit > 0 && ' · '}
                        {e.credit > 0 && <>Paid {formatMoney(e.credit)}</>}
                      </span>
                    </td>
                    <td className="hidden py-2 pr-3 text-right sm:table-cell">{e.debit > 0 ? formatMoney(e.debit) : '—'}</td>
                    <td className="hidden py-2 pr-3 text-right sm:table-cell">{e.credit > 0 ? formatMoney(e.credit) : '—'}</td>
                    <td className={`py-2 text-right font-medium ${e.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatMoney(e.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 space-y-1 border-t border-gray-200 pt-4 text-sm text-gray-600">
          <p className="flex items-center justify-between">
            <span>Goods received in total</span>
            <span>{formatMoney(totals.bought)}</span>
          </p>
          <p className="flex items-center justify-between">
            <span>Paid in total</span>
            <span>{formatMoney(totals.paid)}</span>
          </p>
        </div>
        <p className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
          <span>You owe</span>
          <span className={balance > 0 ? 'text-red-600' : ''}>{formatMoney(balance)}</span>
        </p>
      </article>
    </div>
  );
}
