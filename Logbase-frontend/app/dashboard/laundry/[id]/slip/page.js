'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getLaundryOrder } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { whatsappLink } from '@/lib/receipt';
import { laundryDoc } from '@/lib/receiptDoc';
import { serviceLabel } from '@/lib/laundry';
import { useUser } from '@/components/UserProvider';
import ReceiptPaper from '@/components/ReceiptPaper';
import { identityLines } from '@/lib/settings';
import { ErrorBanner, LoadingState, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

function slipText(order, businessName, org) {
  const lines = [`*${businessName || 'Laundry slip'}*`, ...identityLines(org), `Laundry order ${order.code}`, `Date in: ${formatDate(order.dateIn)}`];
  if (order.deliveryDate) lines.push(`Date out: ${formatDate(order.deliveryDate)}`);
  lines.push(`Customer: ${order.customerName}`, '');
  for (const l of order.lines) {
    const extra = [l.colour, l.stain && `care: ${l.stain}`].filter(Boolean).join(', ');
    const service = l.service && l.service !== 'wash' ? ` [${serviceLabel(l.service)}]` : '';
    lines.push(`${l.quantity} x ${l.itemName}${service}${extra ? ` (${extra})` : ''} = ${formatMoney(l.quantity * l.price)}`);
  }
  lines.push('');
  if (order.express && order.expressFee > 0) lines.push(`Express / same-day (+${order.expressPercent}%): ${formatMoney(order.expressFee)}`);
  if (order.discount > 0) lines.push(`Discount: -${formatMoney(order.discount)}`);
  if (order.deliveryFee > 0) lines.push(`Delivery fee: ${formatMoney(order.deliveryFee)}`);
  lines.push(`*Total: ${formatMoney(order.totalAmount)}*`, `Paid: ${formatMoney(order.amountPaid)}`);
  if (order.balance > 0) lines.push(`*Balance: ${formatMoney(order.balance)}*`);
  lines.push('', order.handover === 'delivery' ? 'We will deliver your clothes to the address above.' : 'Please bring this slip when you come for your clothes.');
  return lines.join('\n');
}

// The slip the customer takes away with the list of clothes they left. Print it or send it on WhatsApp.
export default function LaundrySlipPage() {
  const { id } = useParams();
  const { user, settings } = useUser();
  const org = settings.organization;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getLaundryOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const businessName = user?.businessName || 'Laundry slip';

  if (loading) return <LoadingState />;
  if (!order) {
    return (
      <>
        <Link href="/dashboard/laundry" className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
          ← Back to laundry
        </Link>
        <ErrorBanner message={error || 'Laundry order not found'} />
      </>
    );
  }

  const doc = laundryDoc(order, org);

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
        <Link href={`/dashboard/laundry/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
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
