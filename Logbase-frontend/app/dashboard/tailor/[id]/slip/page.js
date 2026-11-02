'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTailorOrder } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { whatsappLink } from '@/lib/receipt';
import { tailorDoc } from '@/lib/receiptDoc';
import { piecesText } from '@/lib/tailor';
import { useUser } from '@/components/UserProvider';
import ReceiptPaper from '@/components/ReceiptPaper';
import { identityLines } from '@/lib/settings';
import { ErrorBanner, LoadingState, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

function slipText(order, businessName, org) {
  const unit = order.unit === 'cm' ? 'cm' : 'in';
  const lines = [`*${businessName || 'Order slip'}*`, ...identityLines(org), `Order ${order.code}`, `Received: ${formatDate(order.receivedAt)}`, `Customer: ${order.customerName}`];
  if (order.occasion) lines.push(`Occasion: ${order.occasion}`);
  lines.push(`Order: ${piecesText(order.pieces)}`);
  for (const p of order.pieces || []) {
    if ((p.measurements || []).length > 0) lines.push(`${p.style}: ${p.measurements.map((m) => `${m.name} ${m.value}`).join(', ')} (${unit})`);
  }
  if (order.dueDate) lines.push(`Ready on: ${formatDate(order.dueDate)}`);
  if (order.total > 0) {
    lines.push(`Price: ${formatMoney(order.total)}`);
    lines.push(`Paid: ${formatMoney(order.amountPaid)}`);
    lines.push(`*Balance: ${formatMoney(order.balance)}*`);
  }
  lines.push('', 'Please bring this slip when you come for your clothes.');
  return lines.join('\n');
}

// The slip the customer takes away when they leave an order with the tailor. Print it or send it on WhatsApp.
export default function TailorSlipPage() {
  const { id } = useParams();
  const { user, settings } = useUser();
  const org = settings.organization;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getTailorOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const businessName = user?.businessName || 'Order slip';

  if (loading) return <LoadingState />;
  if (!order) {
    return (
      <>
        <Link href="/dashboard/tailor" className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
          ← Back to orders
        </Link>
        <ErrorBanner message={error || 'Order not found'} />
      </>
    );
  }

  const doc = tailorDoc(order, org);

  async function copy() {
    try {
      await navigator.clipboard.writeText(slipText(order, businessName, org));
      setNotice('Slip text copied');
      setTimeout(() => setNotice(''), 2500);
    } catch {
      setError('Could not copy. Select the slip and copy it by hand.');
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 print:hidden">
        <Link href={`/dashboard/tailor/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
          ← Back to the order
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className={primaryButtonClass}>
            Print / Save as PDF
          </button>
          <a href={whatsappLink(order.customerPhone, slipText(order, businessName, org))} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
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
