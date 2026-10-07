// What a staff may do is decided by permissions the owner ticks on the Staffs page.
// The owner always has every permission, and is the only one who ever sees costs, delivery fees and profit. Keep this list in step with LogBase-backend/utils/permissions.js
// (the server is what actually enforces it; this only decides what is shown).

export const PERMISSIONS = [
  { key: 'recordSales', label: 'Record sales', hint: 'Sell items and see the sales they recorded themselves' },
  { key: 'viewAllSales', label: 'See all sales', hint: 'The full sales list, including sales recorded by others' },
  { key: 'viewCustomers', label: 'See customers', hint: 'The Customers page (name, phone, address)' },
  { key: 'addCustomers', label: 'Add customers', hint: 'Save new customers' },
  { key: 'manageCustomers', label: 'Manage customers', hint: 'See what customers owe and their history, record their payments' },
  { key: 'viewStock', label: 'See stock', hint: 'The Products page, without cost prices' },
  { key: 'manageProducts', label: 'Manage products', hint: 'Add, edit and delete products and categories (never sees cost prices)' },
  { key: 'managePurchases', label: 'Purchases', hint: 'Record goods received and see purchases (never sees costs or suppliers)' },
  { key: 'processReturns', label: 'Process returns', hint: 'Take back sold items and refund customers' },
  { key: 'adjustStock', label: 'Adjust stock', hint: 'Record damaged, lost or found items and stock counts' },
  { key: 'viewInsights', label: 'See insights', hint: 'The Overview with revenue and activity (never sees costs or profit)' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Shortcuts that tick a sensible set of boxes (the owner can still change them afterwards).
export const PRESETS = [
  { label: 'Cashier', permissions: ['recordSales', 'viewCustomers', 'addCustomers', 'viewStock'] },
  { label: 'Stock keeper', permissions: ['viewStock', 'manageProducts', 'managePurchases', 'adjustStock'] },
  { label: 'Manager', permissions: [...PERMISSION_KEYS] },
];

export const DEFAULT_STAFF_PERMISSIONS = PRESETS[0].permissions;

// true when `user` has at least one of the wanted permissions (the owner always does)
export function userCan(user, ...wanted) {
  if (!user) return false;
  if (user.role === 'owner') return true;
  const have = Array.isArray(user.permissions) ? user.permissions : [];
  return wanted.some((p) => have.includes(p));
}
