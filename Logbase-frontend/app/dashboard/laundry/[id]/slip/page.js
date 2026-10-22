'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getLaundryOrder } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/receipt';
import { serviceLabel } from '@/lib/laundry';
import { useUser } from '@/components/UserProvider';
import IdentityHeader from '@/components/Identity';
import { identityLines } from '@/lib/settings';
import { ErrorBanner, LoadingState, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

function Row({ label, children, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className={`min-w-0 break-words text-right text-gray-900 ${strong ? 'font-bold' : ''}`}>{children}</span>
    </div>
  );
}

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

  const phone = describePhone(order.customerPhone);
  const showColour = order.lines.some((l) => l.colour);
  const showStain = order.lines.some((l) => l.stain);
  const showRemarks = order.lines.some((l) => l.remarks);

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
    <div className="mx-auto max-w-2xl">
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

      <article className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-[15px] leading-relaxed text-gray-800 shadow-sm sm:px-10 print:rounded-none print:border-0 print:px-2 print:py-2 print:shadow-none">
        <IdentityHeader org={org} name={businessName} title="Laundry slip" />

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        <Row label="Order number" strong>
          {order.code}
        </Row>
        <Row label="Date in">{formatDateTime(order.dateIn)}</Row>
        {order.deliveryDate && <Row label="Date out">{formatDate(order.deliveryDate)}</Row>}
        <Row label="Customer">{order.customerName}</Row>
        {phone.display && <Row label="Phone">{phone.display}</Row>}
        <Row label="Hand-over">{order.handover === 'delivery' ? `Delivery${order.deliveryAddress ? ` to ${order.deliveryAddress}` : ''}` : 'Pick-up'}</Row>
        {order.express && <Row label="Speed">Express / same-day</Row>}

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-1.5 pr-2">Qty</th>
                <th className="py-1.5 pr-2">Item</th>
                {showColour && <th className="py-1.5 pr-2">Colour / description</th>}
                {showStain && <th className="py-1.5 pr-2">Stain / special care</th>}
                {showRemarks && <th className="py-1.5 pr-2">Remarks</th>}
                <th className="py-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.lines.map((l, i) => (
                <tr key={l._id || i} className="align-top">
                  <td className="py-1.5 pr-2">{l.quantity}</td>
                  <td className="py-1.5 pr-2 font-semibold text-gray-900">
                    {l.itemName}
                    {l.service && l.service !== 'wash' && <span className="block text-xs font-normal text-gray-500">{serviceLabel(l.service)}</span>}
                  </td>
                  {showColour && <td className="py-1.5 pr-2">{l.colour || ''}</td>}
                  {showStain && <td className="py-1.5 pr-2">{l.stain || ''}</td>}
                  {showRemarks && <td className="py-1.5 pr-2">{l.remarks || ''}</td>}
                  <td className="tabular py-1.5 text-right">{formatMoney(l.quantity * l.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        <Row label="Total pieces">{order.totalItems}</Row>
        {(order.deliveryFee > 0 || order.expressFee > 0 || order.discount > 0) && <Row label="Items">{formatMoney(order.subtotal)}</Row>}
        {order.express && order.expressFee > 0 && <Row label={`Express / same-day (+${order.expressPercent}%)`}>{formatMoney(order.expressFee)}</Row>}
        {order.discount > 0 && <Row label={`Discount${order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}`}>−{formatMoney(order.discount)}</Row>}
        {order.deliveryFee > 0 && <Row label="Delivery fee">{formatMoney(order.deliveryFee)}</Row>}
        <div className="mt-1 flex items-baseline justify-between text-xl font-extrabold text-gray-900">
          <span>Total</span>
          <span>{formatMoney(order.totalAmount)}</span>
        </div>
        <Row label="Paid so far">{formatMoney(order.amountPaid)}</Row>
        <div className="flex items-baseline justify-between text-lg font-extrabold">
          <span className="text-gray-900">Balance to pay</span>
          <span className={order.balance > 0 ? 'text-red-700' : 'text-green-700'}>{order.balance > 0 ? formatMoney(order.balance) : 'Nil'}</span>
        </div>

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        <p className="text-xs text-gray-500">
          {order.handover === 'delivery' ? 'We will deliver your clothes to the address above. Please check your items when they arrive.' : 'Please bring this slip when you come for your clothes. Check your items before you leave.'}
        </p>

        <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-gray-500">
          <div>
            <div className="border-t border-gray-400 pt-1">Customer&apos;s signature</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-1">Received by{order.recordedByName ? `: ${order.recordedByName}` : ''}</div>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] uppercase tracking-widest text-gray-400">Powered by LogBase | mylogbase.com</p>
      </article>
    </div>
  );
}
