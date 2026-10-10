'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSale } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { buildReceipt, receiptDateTime, receiptText, whatsappLink } from '@/lib/receipt';
import { receiptToPng } from '@/lib/receiptImage';
import { useUser } from '@/components/UserProvider';
import { ErrorBanner, LoadingState } from '@/components/ui';

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';

// A decorative barcode drawn from the receipt number.
function Barcode({ code }) {
  const bars = [];
  let x = 0;
  const text = String(code || '000000');
  for (let i = 0; x < 300; i++) {
    const c = text.charCodeAt(i % text.length) + i * 7;
    const w = 2 + (c % 4);
    bars.push(<rect key={i} x={x} y="0" width={w} height="64" fill="#111827" />);
    x += w + 2 + ((c >> 2) % 4);
  }
  return (
    <svg viewBox={`0 0 ${x} 64`} preserveAspectRatio="none" className="mx-auto h-16 w-64 max-w-full" aria-hidden="true">
      {bars}
    </svg>
  );
}

function Row({ label, children, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className={`min-w-0 break-words text-right uppercase text-gray-900 ${strong ? 'font-bold' : ''}`}>{children}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-5 border-t-2 border-dashed border-gray-300" />;
}

function ActionButton({ children, onClick, href, primary, disabled }) {
  const cls = primary
    ? 'bg-primary text-white shadow-sm hover:bg-primary-dark'
    : 'border border-gray-300 bg-white text-gray-700 shadow-xs hover:bg-gray-50';
  const base = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${cls}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={base}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}

// A receipt for one sale, drawn like a till receipt from a supermarket or a chemist.
// Print it (or save it as a PDF), send it on WhatsApp as a picture, or copy it as text.
export default function ReceiptPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [sale, setSale] = useState(null);
  const [group, setGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

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
  const itemCount = receipt.items.reduce((n, i) => n + i.quantity, 0);
  const paidInFull = receipt.balance <= 0 && receipt.total > 0;

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 2500);
  }

  async function makeFile() {
    const blob = await receiptToPng(receipt, businessName);
    return new File([blob], `receipt-${receipt.number}.png`, { type: 'image/png' });
  }

  function download(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Send on WhatsApp: on a phone this shares the receipt as a picture (choose WhatsApp, then the customer).
  // Where pictures cannot be shared (a computer), it opens WhatsApp with the receipt typed out as text.
  async function sendOnWhatsApp() {
    setError('');
    setBusy(true);
    try {
      const file = await makeFile();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${businessName} receipt`, text: `${businessName} - Receipt #${receipt.number}` });
        } catch (err) {
          if (err && err.name === 'AbortError') return; // the person closed the share sheet
          throw err;
        }
        return;
      }
      window.open(whatsappLink(receipt.customerPhone, text), '_blank', 'noopener,noreferrer');
    } catch {
      window.open(whatsappLink(receipt.customerPhone, text), '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(false);
    }
  }

  async function savePicture() {
    setError('');
    setBusy(true);
    try {
      download(await makeFile());
      flash('Receipt picture saved');
    } catch {
      setError('Could not make the picture. Use Print / Save as PDF instead.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      flash('Receipt text copied');
    } catch {
      setError('Could not copy. Select the receipt and copy it by hand.');
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <style>{`
        .lb-paper { position: relative; background: #fff; }
        .lb-paper::before, .lb-paper::after { content: ''; position: absolute; left: 0; right: 0; height: 12px;
          background-size: 24px 12px; background-repeat: repeat-x; }
        .lb-paper::before { top: -11px; background-image: linear-gradient(135deg, transparent 50%, #fff 50%), linear-gradient(225deg, transparent 50%, #fff 50%); background-size: 12px 12px, 12px 12px; background-position: 0 0, 12px 0; transform: scaleY(-1); }
        .lb-paper::after { bottom: -11px; background-image: linear-gradient(135deg, transparent 50%, #fff 50%), linear-gradient(225deg, transparent 50%, #fff 50%); background-size: 12px 12px, 12px 12px; background-position: 0 0, 12px 0; }
        @media print {
          .lb-paper { box-shadow: none !important; }
          .lb-paper::before, .lb-paper::after { display: none; }
        }
      `}</style>

      <div className="mb-5 print:hidden">
        <Link href={`/dashboard/sales/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
          ← Back to sale
        </Link>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <ActionButton primary onClick={() => window.print()}>
            Print / Save as PDF
          </ActionButton>
          <ActionButton onClick={sendOnWhatsApp} disabled={busy}>
            {busy ? 'Preparing…' : 'Send on WhatsApp'}
          </ActionButton>
          <ActionButton onClick={savePicture} disabled={busy}>
            Save as picture
          </ActionButton>
          <ActionButton onClick={copy}>Copy text</ActionButton>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
        <ErrorBanner message={error} />
      </div>

      <div className="py-3 print:py-0">
        <article
          data-receipt
          className="lb-paper px-6 pb-9 pt-10 text-[15px] leading-relaxed text-gray-800 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.35)] sm:px-10 print:px-2 print:pt-2"
          style={{ fontFamily: MONO }}
        >
          <header className="text-center">
            <h1 className="text-balance text-[26px] font-extrabold uppercase leading-tight tracking-wide text-gray-900 sm:text-3xl">{businessName}</h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Sales receipt</p>
          </header>

          <Divider />

          <div className="space-y-1.5">
            <Row label="RECEIPT #" strong>
              {receipt.number}
            </Row>
            <Row label="DATE">{receiptDateTime(receipt.date)}</Row>
            {receipt.servedBy && <Row label="SERVED BY">{receipt.servedBy}</Row>}
            <Row label="CUSTOMER">{receipt.customerName}</Row>
            {phone.display && <Row label="PHONE">{phone.display}</Row>}
            {receipt.paymentMethod && <Row label="PAYMENT">{receipt.paymentMethod}</Row>}
          </div>

          <Divider />

          <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            <span>Item</span>
            <span>Amount</span>
          </div>
          <ul className="space-y-4">
            {receipt.items.map((item) => (
              <li key={item.id}>
                <p className="break-words text-base font-bold uppercase text-gray-900">{item.name}</p>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-gray-500">
                    {item.quantity} x {formatMoney(item.unitPrice)}
                  </span>
                  <span className="text-base font-bold text-gray-900">{formatMoney(item.amount)}</span>
                </div>
                {item.serials.length > 0 && (
                  <p className="mt-0.5 break-all text-xs uppercase text-gray-500">IMEI / serial: {item.serials.join(', ')}</p>
                )}
                {item.warrantyEndsAt && (
                  <p className="mt-0.5 text-xs uppercase text-gray-500">Warranty until {new Date(item.warrantyEndsAt).toLocaleDateString()}</p>
                )}
                {item.returnedQuantity > 0 && (
                  <p className="mt-0.5 text-xs uppercase text-gray-500">
                    Returned {item.returnedQuantity}: -{formatMoney(item.returnedAmount)}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <Divider />

          <div className="space-y-1.5">
            {receipt.returned > 0 && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>SUBTOTAL</span>
                  <span>{formatMoney(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>RETURNED</span>
                  <span>-{formatMoney(receipt.returned)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>ITEMS SOLD</span>
              <span>{itemCount}</span>
            </div>
            <div className="flex items-baseline justify-between pt-2 text-2xl font-extrabold text-gray-900 sm:text-[28px]">
              <span>TOTAL</span>
              <span>{formatMoney(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-base text-gray-800">
              <span>AMOUNT PAID</span>
              <span className="font-semibold">{formatMoney(receipt.paid)}</span>
            </div>
            {receipt.balance > 0 && (
              <div className="flex items-baseline justify-between pt-1 text-lg font-extrabold text-red-700">
                <span>BALANCE DUE</span>
                <span>{formatMoney(receipt.balance)}</span>
              </div>
            )}
          </div>

          {paidInFull && (
            <div className="mt-5 flex justify-center">
              <span className="-rotate-2 rounded-lg border-[3px] border-green-700 px-5 py-2 text-lg font-extrabold uppercase tracking-[0.25em] text-green-700">
                Paid in full
              </span>
            </div>
          )}

          <Divider />

          <div className="text-center">
            <Barcode code={receipt.number} />
            <p className="mt-2 text-sm font-semibold tracking-[0.4em] text-gray-500">{receipt.number}</p>
          </div>

          <div className="mt-7 text-center">
            <p className="text-base font-extrabold uppercase text-gray-900">Thank you for your business!</p>
            {receipt.hasWarranty && (
              <p className="mt-2 text-xs text-gray-500">Keep this receipt. It is your proof of purchase for the warranty.</p>
            )}
            <p className="mt-4 text-[11px] uppercase tracking-widest text-gray-400">Powered by LogBase | mylogbase.com</p>
          </div>
        </article>
      </div>
    </div>
  );
}
