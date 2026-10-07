'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';

// Which permission(s) a page needs (any one is enough). The first matching rule wins.
// A page that matches no rule (like /dashboard/staffs, /dashboard/billing, /dashboard/expenses, /dashboard/data, /dashboard/deliveries or /dashboard/activity) is for the owner only.
// null = every signed-in person may open it.
// (The server refuses requests for data a person may not see as well; this only keeps people from
// landing on pages that would show errors.)
const RULES = [
  [/^\/dashboard\/?$/, null],
  // everyone can open their own profile
  [/^\/dashboard\/profile\/?$/, null],
  // the old Stock page now redirects to Products; Products (the list) is open to anyone who may see stock
  [/^\/dashboard\/stock\/?$/, ['viewStock', 'manageProducts']],
  [/^\/dashboard\/products\/?$/, ['viewStock', 'manageProducts']],
  [/^\/dashboard\/stock-activities\/?$/, ['viewInsights', 'viewAllSales', 'managePurchases']],
  [/^\/dashboard\/sales\/new\/?$/, ['recordSales']],
  // sales saved on this phone while offline: only the people who can record sales have any
  [/^\/dashboard\/sales\/pending\/?$/, ['recordSales']],
  // a sale and its receipt
  [/^\/dashboard\/sales(\/[^/]+(\/receipt)?)?\/?$/, ['recordSales', 'viewAllSales', 'viewInsights']],
  // changing stock by hand
  [/^\/dashboard\/adjust-stock\/?$/, ['adjustStock']],
  // finding a unit by its IMEI / serial number
  [/^\/dashboard\/serials\/?$/, ['recordSales', 'viewAllSales', 'viewInsights', 'viewStock', 'managePurchases', 'processReturns']],
  // a customer's account statement
  [/^\/dashboard\/(customers|buyers)\/[^/]+\/statement\/?$/, ['manageCustomers']],
  // Customers used to be called Buyers; the old /dashboard/buyers addresses just redirect, so they follow the same rules
  [/^\/dashboard\/(customers|buyers)\/new\/?$/, ['addCustomers', 'manageCustomers']],
  [/^\/dashboard\/(customers|buyers)(\/[^/]+)?\/?$/, ['viewCustomers', 'addCustomers', 'manageCustomers']],
  [/^\/dashboard\/(products|categories)(\/.*)?$/, ['manageProducts']],
  // suppliers, what is owed to them and what was paid are for the administrator only
  [/^\/dashboard\/suppliers(\/.*)?$/, []],
  [/^\/dashboard\/purchases(\/.*)?$/, ['managePurchases']],
];

// `can` is the function from useUser(): can('a', 'b') is true when the person has a or b.
export function canOpen(isOwner, can, pathname) {
  if (isOwner) return true;
  const rule = RULES.find(([pattern]) => pattern.test(pathname));
  if (!rule) return false;
  const needed = rule[1];
  return needed === null || can(...needed);
}

export default function RoleGuard({ children }) {
  const { isOwner, can } = useUser();
  const pathname = usePathname();
  const allowed = canOpen(isOwner, can, pathname);
  const router = useRouter();

  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  return allowed ? children : null;
}
