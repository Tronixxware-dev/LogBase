'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getBilling } from '@/lib/api';
import { bannerFor } from '@/lib/billing';
import { useUser } from '@/components/UserProvider';

const STYLE = {
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  bad: 'border-red-200 bg-red-50 text-red-800',
};

// A strip at the top of the dashboard for the administrator when the trial or plan is about to end
// (or has ended). Nothing is shown for anyone else, or when all is well.
export default function BillingBanner() {
  const { isOwner } = useUser();
  const pathname = usePathname();
  const [sub, setSub] = useState(null);
  const [autoRenew, setAutoRenew] = useState(null);

  const load = useCallback(() => {
    getBilling()
      .then((data) => {
        setSub(data.subscription);
        setAutoRenew(data.autoRenew || null);
      })
      .catch(() => setSub(null)); // a banner is never worth an error message
  }, []);

  useEffect(() => {
    if (!isOwner) return undefined;
    load();
    window.addEventListener('logbase:billing-changed', load);
    return () => window.removeEventListener('logbase:billing-changed', load);
  }, [isOwner, load]);

  if (!isOwner || pathname.startsWith('/dashboard/billing')) return null;
  const banner = bannerFor(sub, autoRenew);
  if (!banner) return null;

  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm print:hidden ${STYLE[banner.tone] || STYLE.warn}`} role="status">
      <span>{banner.text}</span>
      <Link href="/dashboard/billing" className="font-medium underline underline-offset-2">
        {banner.cta}
      </Link>
    </div>
  );
}
