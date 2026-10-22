'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// "Overview | Orders | Deliveries": the three views of the laundry register, shown at the top of each of them.
export default function LaundryTabs() {
  const pathname = usePathname();
  const current = pathname.startsWith('/dashboard/laundry/overview') ? 'overview' : pathname.startsWith('/dashboard/laundry/deliveries') ? 'deliveries' : 'orders';

  const tab = (href, label, key) => {
    const active = current === key;
    return (
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
  };

  return (
    <nav className="mb-5 inline-flex rounded-xl bg-gray-100 p-1" aria-label="Laundry views">
      {tab('/dashboard/laundry/overview', 'Overview', 'overview')}
      {tab('/dashboard/laundry', 'Orders', 'orders')}
      {tab('/dashboard/laundry/deliveries', 'Deliveries', 'deliveries')}
    </nav>
  );
}
