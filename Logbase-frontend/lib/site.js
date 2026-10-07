// Facts about LogBase that the public pages (home, terms, privacy, refunds, contact) all use.
// Change them HERE and every page follows.

export const SITE = {
  name: 'LogBase',
  company: 'Tronixxware',
  tagline: 'Inventory and sales management for shops',
  description:
    'LogBase helps shops track stock, record sales and know who owes them, even without internet. Free 14-day trial.',
  email: 'tronixxware01@gmail.com',
  // the public web address, used for the sitemap and link previews (set NEXT_PUBLIC_SITE_URL in the frontend .env when you deploy)
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  trialDays: 14,
  updated: '7 October 2026', // when the Terms, Privacy and Refund pages were last reviewed
};

// What the plans cost, in naira. Keep this the same as the backend's config/plans.js
// (that file is what actually charges people; this one only shows the prices on the home page).
export const PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'To try LogBase with a small shop',
    monthly: 0,
    yearly: 0,
    features: ['Up to 50 products', 'Owner account only (no staff accounts)'],
  },
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For a shop with a few helpers',
    monthly: 5000,
    yearly: 50000,
    features: ['Up to 500 products', 'Up to 3 staff accounts with their own permissions'],
  },
  {
    key: 'business',
    name: 'Business',
    tagline: 'For a growing business',
    monthly: 15000,
    yearly: 150000,
    popular: true,
    features: ['Unlimited products', 'Unlimited staff accounts with their own permissions', 'Full activity log of who did what'],
  },
];

// Every plan includes these (only the limits above and the activity log differ between plans).
export const ALL_PLANS_INCLUDE = [
  'Sales, purchases and stock tracking',
  'Customers, suppliers and what is owed',
  'Offline sales that sync later',
  'IMEI and serial number tracking',
  'Expenses, profit and reports',
  'Import and export of your data',
];

export function naira(amount) {
  return `₦${Number(amount).toLocaleString('en-NG')}`;
}
