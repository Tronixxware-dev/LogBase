'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getCustomerStatement } from '@/lib/api';
import { statementText, whatsappLink } from '@/lib/receipt';
import { customerStatementDoc } from '@/lib/receiptDoc';
import { useUser } from '@/components/UserProvider';
import ReceiptPaper from '@/components/ReceiptPaper';
import { ErrorBanner, LoadingState } from '@/components/ui';

// The customer's account: every sale, payment and return with the balance after each one.
// Print it (or save it as a PDF from the print window) or send a short version on WhatsApp.
export default function CustomerStatementPage() {
  const { id } = useParams();
  const { user, settings } = useUser();
  const org = settings.organization;
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomerStatement(id)
      .then(setStatement)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const businessName = user?.businessName || 'Statement';

  if (loading) return <LoadingState />;
  if (!statement) {
    return (
      <>
        <Link href={`/dashboard/customers/${id}`} className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
          ← Back to customer
        </Link>
        <ErrorBanner message={error || 'Customer not found'} />
      </>
    );
  }

  const { customer } = statement;
  const text = statementText(statement, businessName, org);
  const doc = customerStatementDoc(statement);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/dashboard/customers/${id}`} className="mr-auto text-sm text-gray-500 hover:text-primary">
          ← Back to customer
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Print / Save as PDF
        </button>
        <a
          href={whatsappLink(customer.phone, text)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Send on WhatsApp
        </a>
      </div>

      <div className="py-3 print:py-0">
        <ReceiptPaper doc={doc} org={org} name={businessName} />
      </div>
    </div>
  );
}
