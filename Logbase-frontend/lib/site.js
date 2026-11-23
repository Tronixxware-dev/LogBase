// Facts about LogBase that the public pages (home, terms, privacy, refunds, contact) all use.
// Change them HERE and every page follows.

export const SITE = {
  name: 'LogBase',
  company: 'Tronixxware',
  tagline: 'Inventory and sales management for any business',
  description:
    'LogBase helps any business track stock, record sales and know who owes them, even without internet. Free to start.',
  // what Google shows in search results for the home page (the title stays under about 60 characters and the description under about 155)
  seoTitle: 'LogBase | Inventory & Sales App for Any Business',
  seoDescription:
    'LogBase helps any business track stock, record sales and see who owes them, even without internet. Free to start, no card needed.',
  email: 'support@mylogbase.com',
  // the public web address, used for the sitemap and link previews (set NEXT_PUBLIC_SITE_URL in the frontend .env when you deploy)
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  // the orders a laundromat or tailor may take each month on the Free plan (keep the same as FREE_MONTHLY_ORDERS in the backend's config/plans.js)
  freeOrdersPerMonth: 30,
  updated: '23 November 2026', // when the Terms, Privacy and Refund pages were last reviewed
};

// What the plans cost, in naira. Keep this the same as the backend's config/plans.js
// (that file is what actually charges people; this one only shows the prices on the home page).
export const PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'To try LogBase for yourself',
    monthly: 0,
    yearly: 0,
    features: ['Up to 30 units in stock', 'Owner account only (no staff accounts)', 'Laundromats and tailors: up to 30 orders a month'],
  },
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For a business with a few helpers',
    monthly: 2000,
    yearly: 20000,
    features: ['Up to 300 units in stock', 'Up to 3 staff accounts with their own permissions'],
  },
  {
    key: 'business',
    name: 'Business',
    tagline: 'For a growing business',
    monthly: 5000,
    yearly: 50000,
    popular: true,
    features: ['Unlimited stock', 'Unlimited staff accounts with their own permissions', 'Full activity log of who did what'],
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

// Where the LogBase app can be downloaded. The /get page sends each phone to the right store:
// Android phones to Google Play, iPhones to the App Store. Print the web address mylogbase.com/get on QR codes
// (not a store link), so the codes keep working when these links change.
// Once the iPhone app is live, set NEXT_PUBLIC_IOS_APP_URL in the frontend .env (the App Store address of the app).
export const APP_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=com.mylogbase.app',
  ios: process.env.NEXT_PUBLIC_IOS_APP_URL || '',
};
