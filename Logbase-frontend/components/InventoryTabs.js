'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserProvider';

// "Products | Categories" at the top of Inventory. Categories belong to people who manage products.
export default function InventoryTabs() {
  const pathname = usePathname();
  const { can } = useUser();
  if (!can('manageProducts')) return null;

  const onCategories = pathname.startsWith('/dashboard/categories');
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
    <nav className="mb-5 inline-flex rounded-xl bg-gray-100 p-1" aria-label="Inventory">
      {tab('/dashboard/inventory', 'Products', !onCategories)}
      {tab('/dashboard/categories', 'Categories', onCategories)}
    </nav>
  );
}
