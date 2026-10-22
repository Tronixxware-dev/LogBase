'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getRepair } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/receipt';
import { methodLabel } from '@/lib/jobs';
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

  const phone = describePhone(repair.customerPhone);
  const deposits = (repair.payments || []).filter((p) => p.kind === 'deposit');

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

      <article className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-[15px] leading-relaxed text-gray-800 shadow-sm sm:px-10 print:rounded-none print:border-0 print:px-2 print:py-2 print:shadow-none">
        <IdentityHeader org={org} name={businessName} title="Repair job slip" />

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        <Row label="Job number" strong>
          {repair.code}
        </Row>
        <Row label="Date received">{formatDateTime(repair.receivedAt)}</Row>
        {repair.promisedDate && <Row label="Promised for">{formatDate(repair.promisedDate)}</Row>}
        <Row label="Customer">{repair.customerName}</Row>
        {phone.display && <Row label="Phone">{phone.display}</Row>}

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        <Row label="Device" strong>
          {repair.device}
        </Row>
        {repair.imei && (
          <Row label="IMEI / serial">
            <span className="font-mono">{repair.imei}</span>
          </Row>
        )}
        {repair.accessories && <Row label="Left with it">{repair.accessories}</Row>}
        <div className="py-1">
          <p className="text-gray-500">Fault reported</p>
          <p className="whitespace-pre-wrap text-gray-900">{repair.fault}</p>
        </div>

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        {repair.quote > 0 ? (
          <>
            <Row label="Repair price (quote)">{formatMoney(repair.quote)}</Row>
            {deposits.map((d) => (
              <Row key={d._id} label={`Deposit (${methodLabel(d.method)})`}>
                {formatMoney(d.amount)}
              </Row>
            ))}
            <Row label="Paid so far">{formatMoney(repair.amountPaid)}</Row>
            <div className="mt-2 flex items-baseline justify-between text-xl font-extrabold text-gray-900">
              <span>Balance to pay</span>
              <span className={repair.balance > 0 ? 'text-red-700' : 'text-green-700'}>{repair.balance > 0 ? formatMoney(repair.balance) : 'Nil'}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600">The price will be confirmed after the fault is checked.</p>
            {repair.amountPaid > 0 && <Row label="Deposit paid">{formatMoney(repair.amountPaid)}</Row>}
          </>
        )}

        <div className="my-5 border-t-2 border-dashed border-gray-300" />

        <p className="text-xs text-gray-500">
          Please bring this slip when you come for your device.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-gray-500">
          <div>
            <div className="border-t border-gray-400 pt-1">Customer&apos;s signature</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-1">Received by{repair.recordedByName ? `: ${repair.recordedByName}` : ''}</div>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] uppercase tracking-widest text-gray-400">Powered by LogBase | mylogbase.com</p>
      </article>
    </div>
  );
}
