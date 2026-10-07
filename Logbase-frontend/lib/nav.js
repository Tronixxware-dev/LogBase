// The menu: which links exist, who sees them, and which one is "current". Used by the sidebar,
// the top bar and the quick-search (Ctrl + K), so they always agree.

// Same structure as the Paystack dashboard: a few top-level items, then a collapsible section with its
// own label. Each item says which permissions show it (any one of them is enough); the owner has all of them.
//   hideWhen:    hide the item when the user has any of these (so "My sales" disappears once they see all sales)
//   ownerHidden: not shown to the owner (who records sales from the Overview buttons)
//   ownerOnly:   shown to the owner only, whatever permissions a staff has (it shows costs)
const salesActive = (showsRecordItem) => (pathname) =>
  pathname === '/dashboard/sales' ||
  (pathname.startsWith('/dashboard/sales/') && !(showsRecordItem && pathname.startsWith('/dashboard/sales/new')));

export const topLinks = [
  { href: '/dashboard', label: 'Overview', icon: 'overview', exact: true },
  { href: '/dashboard/sales/new', label: 'Record sale', icon: 'record', exact: true, perms: ['recordSales'], ownerHidden: true },
  { href: '/dashboard/sales', label: 'Sales', icon: 'sales', perms: ['viewAllSales', 'viewInsights'] },
  {
    href: '/dashboard/sales',
    label: 'My sales',
    icon: 'sales',
    perms: ['recordSales'],
    hideWhen: ['viewAllSales', 'viewInsights'],
  },
  { href: '/dashboard/customers', label: 'Customers', icon: 'customers', perms: ['viewCustomers', 'manageCustomers', 'addCustomers'] },
  { href: '/dashboard/deliveries', label: 'Deliveries', icon: 'deliveries', ownerOnly: true },
  { href: '/dashboard/expenses', label: 'Expenses', icon: 'expenses', ownerOnly: true },
  { href: '/dashboard/activity', label: 'Activity', icon: 'activity', ownerOnly: true },
];

export const productLinks = [
  // products and stock are one page: anyone who may see stock sees the list, only managers can add or edit
  { href: '/dashboard/products', label: 'Products', icon: 'products', perms: ['viewStock', 'manageProducts'] },
  { href: '/dashboard/categories', label: 'Categories', icon: 'categories', perms: ['manageProducts'] },
  {
    href: '/dashboard/stock-activities',
    label: 'Stock activities',
    icon: 'stock',
    perms: ['viewInsights', 'viewAllSales', 'managePurchases'],
  },
  { href: '/dashboard/adjust-stock', label: 'Adjust stock', icon: 'adjust', perms: ['adjustStock'] },
  { href: '/dashboard/purchases', label: 'Purchases', icon: 'purchases', perms: ['managePurchases'] },
  // suppliers, what is owed to them and what was paid are for the administrator only
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: 'suppliers', ownerOnly: true },
  // find a unit by its IMEI / serial number (the server hides what a person may not see)
  {
    href: '/dashboard/serials',
    label: 'IMEI lookup',
    icon: 'lookup',
    perms: ['recordSales', 'viewAllSales', 'viewInsights', 'viewStock', 'managePurchases', 'processReturns'],
  },
];

export const teamLink = { href: '/dashboard/staffs', label: 'Staffs', icon: 'team' };
export const billingLink = { href: '/dashboard/billing', label: 'Billing', icon: 'billing' };
export const dataLink = { href: '/dashboard/data', label: 'Import & export', icon: 'data' };
export const profileLink = { href: '/dashboard/profile', label: 'Your profile', icon: 'user' };

export function isShown(link, { can, isOwner }) {
  if (link.ownerHidden && isOwner) return false;
  if (link.ownerOnly && !isOwner) return false;
  if (link.hideWhen && can(...link.hideWhen)) return false;
  return !link.perms || can(...link.perms);
}

export function isActive(pathname, link, showsRecordItem) {
  if (link.label === 'Sales' || link.label === 'My sales') return salesActive(showsRecordItem)(pathname);
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

// "Home" instead of "Overview" when the person does not get the insights
export function labelFor(link, can) {
  return link.href === '/dashboard' && !can('viewInsights') ? 'Home' : link.label;
}

// Every page this person may open, in menu order, with the name to show for it.
export function visibleLinks({ can, isOwner }) {
  const access = { can, isOwner };
  const top = topLinks.filter((l) => isShown(l, access));
  const products = productLinks.filter((l) => isShown(l, access));
  const owner = isOwner ? [teamLink, dataLink, billingLink] : [];
  return { top, products, owner };
}

// The name of the page for the top bar, from the address.
export function pageTitleFor(pathname, { can, isOwner }) {
  const { top, products, owner } = visibleLinks({ can, isOwner });
  const showsRecordItem = top.some((l) => l.label === 'Record sale');
  const all = [...top, ...products, ...owner, profileLink];
  // the longest matching address wins, so /dashboard/sales/new beats /dashboard/sales
  const match = all
    .filter((l) => isActive(pathname, l, showsRecordItem))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (match) return labelFor(match, can);
  if (pathname.startsWith('/dashboard/buyers')) return 'Customers';
  return 'LogBase';
}
