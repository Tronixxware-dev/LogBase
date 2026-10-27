// The menu: which links exist, who sees them, and which one is "current". Used by the sidebar,
// the top bar and the quick-search (Ctrl + K), so they always agree.

import { DEFAULT_BUSINESS_TYPE, hasFeature } from '@/lib/businessTypes';

// Same structure as the Paystack dashboard: a few top-level items, then a collapsible section with its
// own label. Each item says which permissions show it (any one of them is enough); the owner has all of them.
//   feature:     shown only to the business types that have this feature (see lib/businessTypes.js)
//   typeLabels:  a different name for some business types, e.g. { repair: 'Spare parts' }
//   children:    sub-menu items shown under the item (they follow the same rules)
//   group:       a heading that only opens and closes its sub-menu (Sales); it is shown when at least one sub-menu item is
//   excludePaths: pages under this item's address that belong to another menu item (Laundry orders vs. its Overview)
//   searchOnly:  a page that is reachable in the quick search but has no menu item of its own
//   unlessFeature: hidden for the business types that have this feature (Purchases moves under Sales > Buy for them)
//   hideWhen:    hide the item when the user has any of these (so "My sales" disappears once they see all sales)
//   ownerHidden: not shown to the owner (who records sales from the Overview buttons)
//   ownerOnly:   shown to the owner only, whatever permissions a staff has (it shows costs)
const SWAPS_PATH = '/dashboard/sales/swaps';
const SALES_PERMS = ['recordSales', 'viewAllSales', 'viewInsights'];

// The Sales pages: the list, a sale and its receipt. Swaps and Deliveries have their own sub-menu items.
const salesActive = (showsRecordItem) => (pathname) =>
  pathname === '/dashboard/sales' ||
  (pathname.startsWith('/dashboard/sales/') &&
    !pathname.startsWith(SWAPS_PATH) &&
    !(showsRecordItem && pathname.startsWith('/dashboard/sales/new')));

// the sub-menu under Sales
const salesChildren = [
  { href: '/dashboard/sales', label: 'Orders & Deliveries', icon: 'sales', salesLike: true, feature: 'sales', perms: SALES_PERMS },
  // what you paid for deliveries (the administrator only)
  { href: '/dashboard/deliveries', label: 'Deliveries', icon: 'deliveries', ownerOnly: true, feature: 'deliveries' },
  {
    href: SWAPS_PATH,
    label: 'Swaps',
    icon: 'swap',
    feature: 'swaps',
    perms: SALES_PERMS,
  },
  { href: '/dashboard/returns', label: 'Returns', icon: 'returns', feature: 'sales', perms: ['processReturns', 'viewAllSales', 'viewInsights'] },
  // buying stock from suppliers (the Purchases pages)
  { href: '/dashboard/purchases', label: 'Buy', icon: 'buy', feature: 'sales', perms: ['managePurchases'] },
  // what customers still owe
  { href: '/dashboard/credit', label: 'Credit', icon: 'credit', feature: 'sales', perms: ['manageCustomers'] },
];

export const topLinks = [
  { href: '/dashboard', label: 'Overview', icon: 'overview', exact: true, feature: 'overview' },
  { href: '/dashboard/sales/new', label: 'Record sale', icon: 'record', exact: true, perms: ['recordSales'], ownerHidden: true, feature: 'sales' },
  // "My sales" for someone who only records sales; see labelFor
  { href: '/dashboard/sales', label: 'Sales', icon: 'sales', group: true, salesLike: true, children: salesChildren },
  {
    href: '/dashboard/repairs',
    label: 'Repairs',
    icon: 'wrench',
    feature: 'repairs',
    perms: ['recordSales', 'viewAllSales', 'viewInsights'],
  },
  // the laundromat's own Overview, its orders (the register) and its deliveries
  { href: '/dashboard/laundry/overview', label: 'Overview', icon: 'overview', exact: true, feature: 'laundry', perms: ['recordSales', 'viewAllSales', 'viewInsights'] },
  {
    href: '/dashboard/laundry',
    label: 'Orders',
    icon: 'shirt',
    feature: 'laundry',
    perms: ['recordSales', 'viewAllSales', 'viewInsights'],
    // (these two have their own menu items)
    excludePaths: ['/dashboard/laundry/overview', '/dashboard/laundry/deliveries'],
  },
  { href: '/dashboard/laundry/deliveries', label: 'Deliveries', icon: 'deliveries', feature: 'laundry', perms: ['recordSales', 'viewAllSales', 'viewInsights'] },
  { href: '/dashboard/customers', label: 'Customers', icon: 'customers', perms: ['viewCustomers', 'manageCustomers', 'addCustomers'] },
  { href: '/dashboard/expenses', label: 'Expenses', icon: 'expenses', ownerOnly: true },
  { href: '/dashboard/activity', label: 'Activity', icon: 'activity', ownerOnly: true },
];

export const productLinks = [
  // the whole stock of the store you work in, with filters, low stock and the archive
  { href: '/dashboard/inventory', label: 'Inventory', icon: 'inventory', perms: ['viewStock', 'manageProducts'], feature: 'products' },
  // stock sent between stores
  { href: '/dashboard/transfers', label: 'Transfers', icon: 'transfer', perms: ['adjustStock', 'manageProducts', 'managePurchases', 'viewStock', 'viewInsights'], feature: 'products' },
  // products and stock are one page: anyone who may see stock sees the list, only managers can add or edit
  { href: '/dashboard/products', label: 'Products', icon: 'products', perms: ['viewStock', 'manageProducts'], feature: 'products', typeLabels: { repair: 'Spare parts' } },
  { href: '/dashboard/categories', label: 'Categories', icon: 'categories', perms: ['manageProducts'], feature: 'products' },
  {
    href: '/dashboard/stock-activities',
    label: 'Stock activities',
    icon: 'stock',
    perms: ['viewInsights', 'viewAllSales', 'managePurchases'],
    feature: 'products',
  },
  { href: '/dashboard/adjust-stock', label: 'Adjust stock', icon: 'adjust', perms: ['adjustStock'], feature: 'products' },
  // for the business types that have Sales, Purchases is Sales > Buy
  { href: '/dashboard/purchases', label: 'Purchases', icon: 'purchases', perms: ['managePurchases'], feature: 'products', unlessFeature: 'sales' },
  // suppliers, what is owed to them and what was paid are for the administrator only
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: 'suppliers', ownerOnly: true, feature: 'products' },
  // find a unit by its IMEI / serial number (the server hides what a person may not see)
  {
    href: '/dashboard/serials',
    label: 'IMEI lookup',
    icon: 'lookup',
    feature: 'imei',
    perms: ['recordSales', 'viewAllSales', 'viewInsights', 'viewStock', 'managePurchases', 'processReturns'],
  },
];

export const teamLink = { href: '/dashboard/staffs', label: 'Staffs', icon: 'team' };
export const storesLink = { href: '/dashboard/stores', label: 'Stores', icon: 'store', feature: 'products' };
export const billingLink = { href: '/dashboard/billing', label: 'Billing', icon: 'billing' };
export const dataLink = { href: '/dashboard/data', label: 'Import & export', icon: 'data' };
export const profileLink = { href: '/dashboard/profile', label: 'Your profile', icon: 'user' };
// Settings (the hub of cards) and the approvals inbox
export const settingsLink = { href: '/dashboard/settings', label: 'Settings', icon: 'settings' };
export const approvalsLink = { href: '/dashboard/approvals', label: 'Approvals', icon: 'approve' };
// alerts page (the bell opens a short list; this is the full one)
// a referrer (someone the admin linked to a referral code) gets this in their menu
export const referralsLink = { href: '/dashboard/referrals', label: 'Referrals', icon: 'tag' };
export const alertsLink = { href: '/dashboard/notifications', label: 'Alerts', icon: 'bell' };

// `businessType` is optional: leave it out to ignore the business type (the top bar does, so every page has a title).
export function isShown(link, { can, isOwner, businessType }) {
  if (businessType && link.feature && !hasFeature(businessType, link.feature)) return false;
  if (businessType && link.unlessFeature && hasFeature(businessType, link.unlessFeature)) return false;
  if (link.ownerHidden && isOwner) return false;
  if (link.ownerOnly && !isOwner) return false;
  if (link.hideWhen && can(...link.hideWhen)) return false;
  return !link.perms || can(...link.perms);
}

export function isActive(pathname, link, showsRecordItem) {
  if (link.excludePaths && link.excludePaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  if (link.salesLike) return salesActive(showsRecordItem)(pathname);
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

// "Home" instead of "Overview" when the person does not get the insights; the name some business types use instead
export function labelFor(link, can, businessType) {
  // someone who only records sales sees "My sales" (the list holds just their own)
  if (link.group && link.label === 'Sales' && !can('viewAllSales', 'viewInsights') && can('recordSales')) return 'My sales';
  if (link.typeLabels && businessType && link.typeLabels[businessType]) return link.typeLabels[businessType];
  return link.href === '/dashboard' && !can('viewInsights') ? 'Home' : link.label;
}

// What the Products section is called in the sidebar
export function productsSectionLabel(businessType) {
  return businessType === 'repair' ? 'Spare parts' : 'Products';
}

// The sub-menu items of a link follow the same rules as the link itself.
function withChildren(link, access) {
  if (!link.children) return link;
  const children = link.children.filter((c) => isShown(c, access));
  return children.length > 0 ? { ...link, children } : { ...link, children: undefined };
}

// A heading (Sales) is shown only when something under it is: a menu item with only quick-search pages under it is empty.
function hasMenuItems(link) {
  return !link.group || Boolean(link.children && link.children.some((c) => !c.searchOnly));
}

// Every page this person may open, in menu order, with the name to show for it.
// `approvalsOn`: some approval rule is switched on (a staff then gets "My requests" in the menu)
export function visibleLinks({ can, isOwner, businessType = DEFAULT_BUSINESS_TYPE, approvalsOn = false, isReferrer = false }) {
  const access = { can, isOwner, businessType };
  const top = topLinks
    .filter((l) => isShown(l, access))
    .map((l) => withChildren(l, access))
    .filter(hasMenuItems);
  const products = productLinks.filter((l) => isShown(l, access));
  // Settings is always the last item of the menu
  const referrals = isReferrer ? [referralsLink] : [];
  const owner = isOwner ? [approvalsLink, teamLink, storesLink, dataLink, billingLink, ...referrals, settingsLink].filter((l) => isShown(l, access)) : [];
  // a staff has Settings too (their profile and alerts), and "My requests" once the administrator has switched a rule on
  const account = isOwner ? [] : [...(approvalsOn ? [{ ...approvalsLink, label: 'My requests' }] : []), ...referrals, settingsLink];
  return { top, products, owner, account };
}

// The links and their sub-menu items in one flat list (for the quick-search and the page title).
export function flattenLinks(links) {
  return links.flatMap((l) => [{ ...l, children: undefined }, ...(l.children || [])]);
}

// The name of the page for the top bar, from the address.
export function pageTitleFor(pathname, { can, isOwner }) {
  const { top, products, owner } = visibleLinks({ can, isOwner, businessType: null });
  const showsRecordItem = top.some((l) => l.label === 'Record sale');
  // (Purchases is also Sales > Buy: the page keeps the name Purchases)
  const all = [...products, ...flattenLinks(top), ...owner, profileLink, settingsLink, approvalsLink, alertsLink, referralsLink];
  // the longest matching address wins, so /dashboard/sales/new beats /dashboard/sales
  const match = all
    .filter((l) => isActive(pathname, l, showsRecordItem))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (match) return labelFor(match, can);
  if (pathname.startsWith('/dashboard/buyers')) return 'Customers';
  return 'LogBase';
}
