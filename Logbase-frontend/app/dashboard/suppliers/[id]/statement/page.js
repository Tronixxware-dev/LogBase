'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSupplierStatement } from '@/lib/api';
import { supplierStatementDoc } from '@/lib/receiptDoc';
import { useUser } from '@/components/UserProvider';
import ReceiptPaper from '@/components/ReceiptPaper';
import { ErrorBanner, LoadingState } from '@/components/ui';

// The account with a supplier: every purchase and payment, with what is owed after each one.
// Administrator only. Print it, or save it as a PDF from the print window.
export default function SupplierStatementPage() {
  const { id } = useParams();
  const { user, settings } = useUser();
  const org = settings.organization;
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

  const doc = supplierStatementDoc(statement);

  return (
    <div className="mx-auto max-w-xl">
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

      <div className="py-3 print:py-0">
        <ReceiptPaper doc={doc} org={org} name={businessName} />
      </div>
    </div>
  );
}
