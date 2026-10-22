// The kinds of business LogBase is set up for. The type is chosen at signup (the server keeps it on the business)
// and decides which menus and pages a business gets. The server has the same list in utils/businessTypes.js.

export const BUSINESS_TYPES = [
  { key: 'phone_shop', label: 'Phone & gadget shop', icon: 'phone', blurb: 'Sell phones and gadgets with IMEI tracking, swaps and repairs.' },
  { key: 'retail', label: 'General shop / retail', icon: 'store', blurb: 'Products, stock, sales, customers and debts.' },
  { key: 'laundromat', label: 'Laundromat', icon: 'shirt', blurb: 'A laundry register: clothes in, price, pick-up and delivery.' },
  { key: 'repair', label: 'Repair workshop', icon: 'wrench', blurb: 'Repair jobs with deposits, status, spare parts and job slips.' },
];

// Businesses created before types existed are phone & gadget shops, so nothing changes for them.
export const DEFAULT_BUSINESS_TYPE = 'phone_shop';

// What each type gets. A menu item or button that names a feature is shown only to the types that have it.
const FEATURES = {
  phone_shop: ['overview', 'sales', 'swaps', 'repairs', 'products', 'imei', 'deliveries'],
  retail: ['overview', 'sales', 'products', 'deliveries'],
  laundromat: ['laundry'],
  repair: ['repairs', 'products'],
};

// The first page a type opens on (the Overview shows sales, which a laundromat or a workshop does not have).
const HOME = {
  laundromat: '/dashboard/laundry/overview',
  repair: '/dashboard/repairs',
};

export function businessTypeOf(user) {
  const type = user && user.businessType;
  return BUSINESS_TYPES.some((t) => t.key === type) ? type : DEFAULT_BUSINESS_TYPE;
}

export function hasFeature(type, feature) {
  return (FEATURES[type] || FEATURES[DEFAULT_BUSINESS_TYPE]).includes(feature);
}

export function homePathFor(type) {
  return HOME[type] || '/dashboard';
}

export function businessTypeLabel(type) {
  const found = BUSINESS_TYPES.find((t) => t.key === type);
  return found ? found.label : '';
}
