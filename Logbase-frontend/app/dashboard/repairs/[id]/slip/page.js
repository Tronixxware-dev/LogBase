'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getRepair } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { whatsappLink } from '@/lib/receipt';
import { repairDoc } from '@/lib/receiptDoc';
import { useUser } from '@/components/UserProvider';
import ReceiptPaper from '@/components/ReceiptPaper';
import { identityLines } from '@/lib/settings';
import { ErrorBanner, LoadingState, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

function slipText(repair, businessName, org) {
  const lines = [`*${businessName || 'Repair job slip'}*`, ...identityLines(org), `Repair job ${repair.code}`, `Received: ${formatDate(repair.receivedAt)}`, `Customer: ${repair.customerName}`, `Device: ${repair.device}`];
  if (repair.imei) lines.push(`IMEI / serial: ${repair.imei}`);
  lines.push(`Fault: ${repair.fault}`);
  if (repair.promisedDate) lines.push(`Promised for: ${formatDate(repair.promisedDate)}`);
  if (repair.quote > 0) {
    lines.push(`Quote: ${formatMoney(repair.quote)}`);
    lines.push(`Paid: ${formatMoney(repair.amountPaid)}`);
    lines.push(`*Balance: ${formatMoney(repair.balance)}*`);
  }
  lines.push('', 'Please bring this slip when you come for your device.');
  return lines.join('\n');
}

// The slip the customer takes away when they leave a device for repair. Print it or send it on WhatsApp.
export default function RepairSlipPage() {
  const { id } = useParams();
  const { user, settings } = useUser();
  const org = settings.organization;
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getRepair(id)
      .then((data) => setRepair(data.repair))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const businessName = user?.businessName || 'Repair job slip';

  if (loading) return <LoadingState />;
  if (!repair) {
    return (
      <>
        <Link href="/dashboard/repairs" className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
          ← Back to repairs
        </Link>
        <ErrorBanner message={error || 'Repair job not found'} />
      </>
    );
  }

  const doc = repairDoc(repair, org);

  async function copy() {
    try {
      await navigator.clipboard.writeText(slipText(repair, businessName, org));
      setNotice('Slip text copied');
      setTimeout(() => setNotice(''), 2500);
    } catch {
      setError('Could not copy. Select the slip and copy it by hand.');
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 print:hidden">
        <Link href={`/dashboard/repairs/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
          ← Back to the job
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className={primaryButtonClass}>
            Print / Save as PDF
          </button>
          <a href={whatsappLink(repair.customerPhone, slipText(repair, businessName, org))} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
            Send on WhatsApp
          </a>
          <button type="button" onClick={copy} className={secondaryButtonClass}>
            Copy text
          </button>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
        <ErrorBanner message={error} />
      </div>

      <div className="py-3 print:py-0">
        <ReceiptPaper doc={doc} org={org} name={businessName} />
      </div>
    </div>
  );
}
