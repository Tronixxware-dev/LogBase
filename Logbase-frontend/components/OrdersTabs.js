'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { businessTypeOf, hasFeature } from '@/lib/businessTypes';

// "Orders | Deliveries": the two halves of Sales > Orders & Deliveries. Only the administrator sees what deliveries cost,
// so everyone else just sees the sales list and no tabs.
export default function OrdersTabs() {
  const pathname = usePathname();
  const { isOwner, user } = useUser();
  if (!isOwner || !hasFeature(businessTypeOf(user), 'deliveries')) return null;

  const onDeliveries = pathname.startsWith('/dashboard/deliveries');
  const tab = (href, label, active) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-4 py-1.5 text-sm transition-all duration-200 ${
        active ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="mb-5 inline-flex rounded-xl bg-gray-100 p-1" aria-label="Orders and deliveries">
      {tab('/dashboard/sales', 'Orders', !onDeliveries)}
      {tab('/dashboard/deliveries', 'Deliveries', onDeliveries)}
    </nav>
  );
}
