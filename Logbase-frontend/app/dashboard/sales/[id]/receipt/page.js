'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSale } from '@/lib/api';
import { buildReceipt, receiptText, whatsappLink } from '@/lib/receipt';
import { saleDoc } from '@/lib/receiptDoc';
import { receiptToPng } from '@/lib/receiptImage';
import { useUser } from '@/components/UserProvider';
import ReceiptPaper from '@/components/ReceiptPaper';
import { ErrorBanner, LoadingState } from '@/components/ui';

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

// A receipt for one sale, drawn like a till receipt from a supermarket or a chemist (the same paper as every slip and statement).
// Print it (or save it as a PDF), send it on WhatsApp as a picture, or copy it as text.
export default function ReceiptPage() {
  const { id } = useParams();
  const { user, settings } = useUser();
  const org = settings.organization;
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
  const showSeller = org.receipt.showSeller;
  const receipt = useMemo(() => {
    if (!sale) return null;
    const built = buildReceipt({ sale, lines: group.length > 1 ? group : [sale] });
    // the administrator can choose not to print who served the customer
    return showSeller ? built : { ...built, servedBy: '' };
  }, [sale, group, showSeller]);

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

  const text = receiptText(receipt, businessName, org);
  const doc = saleDoc(receipt);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 2500);
  }

  async function makeFile() {
    const blob = await receiptToPng(doc, businessName, org);
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
        <ReceiptPaper doc={doc} org={org} name={businessName} />
      </div>
    </div>
  );
}
