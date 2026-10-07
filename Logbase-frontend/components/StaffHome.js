'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listProducts } from '@/lib/api';
import { useUser } from '@/components/UserProvider';
import AnimatedNumber from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icons';
import { cardClass, LoadingState } from '@/components/ui';

function HeroLink({ href, solid, icon, children }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] ${
        solid
          ? 'bg-[#ffffff] text-[#0f766e] shadow-md hover:shadow-lg hover:brightness-95'
          : 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25'
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {children}
    </Link>
  );
}

// The home screen for anyone without the "See insights" permission: buttons for what they may do, and a quick
// look at the shelves if they may see stock. No money figures, profit, purchases or costs.
export default function StaffHome() {
  const { user, can } = useUser();
  const showStock = can('viewStock', 'manageProducts');
  const canRecord = can('recordSales');
  const canAddCustomer = can('addCustomers', 'manageCustomers');

  const [products, setProducts] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!showStock) return;
    listProducts()
      .then((data) => setProducts(data.products || []))
      .catch(() => setFailed(true));
  }, [showStock]);

  const units = products ? products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0) : 0;
  const lowOrOut = products ? products.filter((p) => p.quantity <= p.reorderThreshold) : [];
  const nothingAllowed = !canRecord && !canAddCustomer && !showStock && !can('viewCustomers', 'viewAllSales', 'managePurchases');

  return (
    <>
      <section className="brand-gradient relative mb-6 overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{`Hello, ${user.name}`}</h1>
            <p className="mt-1.5 text-sm text-teal-50/85">
              {user.jobTitle ? `${user.jobTitle} at your business.` : 'Welcome to LogBase.'}
            </p>
          </div>
          {(canRecord || canAddCustomer) && (
            <div className="flex flex-wrap gap-2.5">
              {canRecord && (
                <HeroLink href="/dashboard/sales/new" solid icon="plus">
                  Record sale
                </HeroLink>
              )}
              {canAddCustomer && (
                <HeroLink href="/dashboard/customers/new" icon="customers">
                  Add customer
                </HeroLink>
              )}
            </div>
          )}
        </div>
      </section>

      {nothingAllowed && (
        <p className={`${cardClass} p-5 text-sm text-gray-500`}>
          You do not have access to anything yet. Ask the administrator of the business to give you access.
        </p>
      )}

      {showStock && (
        <>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Stock at a glance
          </h2>

          {failed && (
            <p className={`${cardClass} p-5 text-sm text-gray-500`}>
              The stock could not be loaded right now. Refresh the page to try again.
            </p>
          )}
          {!products && !failed && <LoadingState />}

          {products && (
            <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link href="/dashboard/products" className={`${cardClass} hover-lift group p-5`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Icon name="stock" className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm text-gray-500">Available stock</p>
                <p className="tabular mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                  <AnimatedNumber value={units} />
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  units across {products.length} product{products.length === 1 ? '' : 's'}
                </p>
              </Link>

              <Link
                href="/dashboard/products?lowStock=true"
                className={`${cardClass} hover-lift group p-5 ${lowOrOut.length > 0 ? '!border-amber-300' : ''}`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    lowOrOut.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  <Icon name={lowOrOut.length > 0 ? 'alert' : 'check'} className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm text-gray-500">Running low or out</p>
                <p
                  className={`tabular mt-1 text-3xl font-semibold tracking-tight ${
                    lowOrOut.length > 0 ? 'text-amber-600' : 'text-gray-900'
                  }`}
                >
                  {lowOrOut.length}
                </p>
                {lowOrOut.length > 0 && (
                  <p className="mt-1 truncate text-xs text-gray-400">
                    {lowOrOut
                      .slice(0, 3)
                      .map((p) => p.name)
                      .join(', ')}
                    {lowOrOut.length > 3 && ` and ${lowOrOut.length - 3} more`}
                  </p>
                )}
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
