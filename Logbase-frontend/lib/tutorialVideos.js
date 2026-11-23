// The "Watch how" tutorial videos. They are hosted on Cloudinary for now.
//
// MOVING TO YOUTUBE LATER: put each video's YouTube id in YOUTUBE_IDS below (key = "set/video", for example
// 'gadget/03-record-sale': 'AbC123xyz'). A video that has an id there plays from YouTube; the rest keep playing from Cloudinary.
// Nothing else in the app needs to change.

export const CLOUD_NAME = 'dzhhvl7lu';
const FOLDER = 'logbase-tutorials';

export const YOUTUBE_IDS = {
  // 'gadget/03-record-sale': 'AbC123xyz',
};

const T = (key, title) => ({ key, title });

const SHOP = [
  T('01-add-products', 'Add your products'),
  T('02-restock', 'Restock your shop'),
  T('03-record-sale', 'Record a sale'),
  T('04-customers-debts', 'Customers and debts'),
  T('05-sell-offline', 'Sell with no internet'),
  T('06-fix-stock', 'Fix your stock count'),
  T('07-returns', 'Handle returns'),
  T('08-imei-tracking', 'Track phones by IMEI'),
  T('09-expenses-profit', 'Expenses and real profit'),
  T('10-staff-permissions', 'Staff and permissions'),
  T('11-import-export', 'Import and export'),
  T('12-overview-activity', 'Overview and activity'),
];

// supermarkets and pharmacies have an alerts video where a phone shop has IMEI tracking
const RETAIL = SHOP.map((v) => (v.key === '08-imei-tracking' ? T('08-alerts-bell', 'Never miss an alert') : v));

// Videos that belong to a feature, not to one kind of business. Every business that has the feature sees them
// (see GENERAL_FOR_TYPE below), under "More features" on the tutorials page.
const GENERAL = [
  T('01-plans-billing', 'Your plan and billing'),
  T('02-earn-with-referrals', 'Earn with referrals'),
  T('03-settings-receipts', 'Settings and receipts'),
  T('04-approvals', 'Approve before it happens'),
  T('05-stores', 'Add a store'),
  T('06-transfers', 'Move stock between stores'),
  T('07-deliveries', 'Track delivery costs'),
  T('08-swaps', 'Swap an old phone'),
];

export const SETS = {
  general: { file: 'General', label: 'More features', videos: GENERAL },
  repair: {
    file: 'Repair',
    label: 'Repair workshop',
    videos: [
      T('01-take-in-a-repair', 'Take in a repair'),
      T('02-repair-progress', 'Track the repair'),
      T('03-spare-parts', 'Spare parts on a job'),
      T('04-take-a-payment', 'Payments and balances'),
      T('05-job-slip', 'Print the job slip'),
      T('06-find-jobs', 'Find any job fast'),
      T('07-spare-parts-stock', 'Add your spare parts'),
      T('08-expenses', 'Track your expenses'),
      T('09-staff-access', 'Add your staff'),
    ],
  },
  gadget: { file: 'Gadget', label: 'Phone & gadget shop', videos: SHOP },
  supermarket: { file: 'Supermarket', label: 'Supermarket / provisions', videos: RETAIL },
  pharmacy: { file: 'Pharmacy', label: 'Pharmacy', videos: RETAIL },
  tailoring: {
    file: 'Tailoring',
    label: 'Tailor / fashion designer',
    videos: [
      T('01-take-an-order', 'Take an order'),
      T('02-measurement-book', 'Keep a measurement book'),
      T('03-styles-prices', 'Styles and prices'),
      T('04-fittings', 'Fittings'),
      T('05-cloth-materials', 'Cloth and materials'),
      T('06-tailors-pay', 'Pay your tailors'),
      T('07-track-orders', 'Track your orders'),
      T('08-deposits-balances', 'Deposits and balances'),
      T('09-ready-made-fabric', 'Ready-made and fabric'),
      T('10-staff-access', 'Staff access'),
    ],
  },
  laundromat: {
    file: 'Laundromat',
    label: 'Laundromat',
    videos: [
      T('01-set-your-prices', 'Set your prices'),
      T('02-take-an-order', 'Take an order'),
      T('03-express-discount-total', 'Express, discount and total'),
      T('04-track-the-order', 'Track the order'),
      T('05-slip-and-tags', 'Slips and tags'),
      T('06-delivery-riders', 'Delivery riders'),
      T('07-customers-balances', 'Customers and balances'),
      T('08-expenses', 'Expenses'),
      T('09-staff-access', 'Staff access'),
      T('10-overview', 'Overview'),
    ],
  },
};

// Which video sets each kind of business (see lib/businessTypes.js) can watch.
const SETS_FOR_TYPE = {
  phone_shop: ['gadget'],
  retail: ['supermarket', 'pharmacy'],
  laundromat: ['laundromat'],
  repair: ['repair'],
  tailor: ['tailoring'],
};

// Which of the "More features" videos each kind of business gets: the ones for pages it has.
const GENERAL_FOR_TYPE = {
  phone_shop: ['01-plans-billing', '02-earn-with-referrals', '03-settings-receipts', '04-approvals', '05-stores', '06-transfers', '07-deliveries', '08-swaps'],
  retail: ['01-plans-billing', '02-earn-with-referrals', '03-settings-receipts', '04-approvals', '05-stores', '06-transfers', '07-deliveries'],
  repair: ['01-plans-billing', '02-earn-with-referrals', '03-settings-receipts', '04-approvals', '05-stores', '06-transfers'],
  tailor: ['01-plans-billing', '02-earn-with-referrals', '03-settings-receipts', '04-approvals', '05-stores', '06-transfers'],
  laundromat: ['01-plans-billing', '02-earn-with-referrals', '03-settings-receipts', '04-approvals'],
};

// the "More features" videos for this kind of business (each one marked as belonging to the general set)
export function generalVideosForType(type) {
  const keys = GENERAL_FOR_TYPE[type] || [];
  return GENERAL.filter((v) => keys.includes(v.key)).map((v) => ({ ...v, set: 'general' }));
}

// A phone shop also takes in repairs, so it gets the repair videos about the Repairs pages (not the stock, expenses and staff ones).
const REPAIR_PAGES_KEYS = ['01-take-in-a-repair', '02-repair-progress', '03-spare-parts', '04-take-a-payment', '05-job-slip', '06-find-jobs'];

// everything shown under "More features" on the tutorials page: repair videos (phone shops only), then the feature videos
export function extraVideosForType(type) {
  const repairs = type === 'phone_shop' ? SETS.repair.videos.filter((v) => REPAIR_PAGES_KEYS.includes(v.key)).map((v) => ({ ...v, set: 'repair' })) : [];
  return [...repairs, ...generalVideosForType(type)];
}

export function setsForType(type) {
  return SETS_FOR_TYPE[type] || [];
}

// Which videos belong to which page. The first matching rule wins, so the specific pages come before the general ones.
const SHOP_RULES = [
  // products: the list, one product, a new one, categories and the inventory view
  [/^\/dashboard\/(products|categories|inventory)(\/.*)?$/, ['01-add-products']],
  // restocking: purchases (and each purchase) and the suppliers you buy from
  [/^\/dashboard\/(purchases|suppliers)(\/.*)?$/, ['02-restock']],
  [/^\/dashboard\/sales\/new\/?$/, ['03-record-sale']],
  [/^\/dashboard\/sales\/pending\/?$/, ['05-sell-offline']],
  // swaps have no video yet
  [/^\/dashboard\/sales\/swaps(\/.*)?$/, []],
  // the list of sales, one sale and its receipt
  [/^\/dashboard\/(sales|collections)(\/.*)?$/, ['03-record-sale']],
  [/^\/dashboard\/(customers|credit|buyers)(\/.*)?$/, ['04-customers-debts']],
  [/^\/dashboard\/(adjust-stock|stock-activities)\/?$/, ['06-fix-stock']],
  [/^\/dashboard\/returns\/?$/, ['07-returns']],
  [/^\/dashboard\/expenses\/?$/, ['09-expenses-profit']],
  [/^\/dashboard\/(staffs|workers)(\/.*)?$/, ['10-staff-permissions']],
  [/^\/dashboard\/data\/?$/, ['11-import-export']],
  [/^\/dashboard(\/activity)?\/?$/, ['12-overview-activity']],
];

// Pages with a video of their own that is not tied to one kind of business.
const GENERAL_RULES = [
  [/^\/dashboard\/billing\/?$/, ['01-plans-billing']],
  [/^\/dashboard\/referrals\/?$/, ['02-earn-with-referrals']],
  [/^\/dashboard\/(approvals|settings\/approvals)\/?$/, ['04-approvals']],
  [/^\/dashboard\/settings(\/(organization|preferences|notifications))?\/?$/, ['03-settings-receipts']],
  [/^\/dashboard\/stores\/?$/, ['05-stores']],
  [/^\/dashboard\/transfers(\/.*)?$/, ['06-transfers']],
  [/^\/dashboard\/deliveries\/?$/, ['07-deliveries']],
  [/^\/dashboard\/sales\/swaps(\/.*)?$/, ['08-swaps']],
];

const RULES = {
  repair: [
    [/^\/dashboard\/repairs\/new\/?$/, ['01-take-in-a-repair']],
    [/^\/dashboard\/repairs\/[^/]+\/slip\/?$/, ['05-job-slip']],
    // one job: its progress, the parts used on it, and the payments on it
    [/^\/dashboard\/repairs\/[^/]+\/?$/, ['02-repair-progress', '03-spare-parts', '04-take-a-payment']],
    [/^\/dashboard\/repairs\/?$/, ['06-find-jobs']],
    [/^\/dashboard\/(products|categories|inventory|purchases|suppliers)(\/.*)?$/, ['07-spare-parts-stock']],
    [/^\/dashboard\/expenses\/?$/, ['08-expenses']],
    [/^\/dashboard\/(staffs|workers)(\/.*)?$/, ['09-staff-access']],
  ],
  gadget: [[/^\/dashboard\/serials\/?$/, ['08-imei-tracking']], ...SHOP_RULES],
  supermarket: [[/^\/dashboard\/notifications\/?$/, ['08-alerts-bell']], ...SHOP_RULES],
  pharmacy: [[/^\/dashboard\/notifications\/?$/, ['08-alerts-bell']], ...SHOP_RULES],
  tailoring: [
    [/^\/dashboard\/tailor\/new\/?$/, ['01-take-an-order']],
    [/^\/dashboard\/tailor\/measurements\/?$/, ['02-measurement-book']],
    [/^\/dashboard\/tailor\/styles\/?$/, ['03-styles-prices']],
    [/^\/dashboard\/tailor\/workers\/?$/, ['06-tailors-pay']],
    [/^\/dashboard\/tailor\/overview\/?$/, ['07-track-orders']],
    [/^\/dashboard\/tailor\/?$/, ['07-track-orders']],
    // one order: its fittings, the cloth used on it, and the deposit paid on it
    [/^\/dashboard\/tailor\/[^/]+\/?$/, ['04-fittings', '05-cloth-materials', '08-deposits-balances']],
    [/^\/dashboard\/(products(\/.*)?|sales\/new\/?)$/, ['09-ready-made-fabric']],
    [/^\/dashboard\/workers\/[^/]+\/?$/, ['06-tailors-pay']],
    [/^\/dashboard\/staffs\/?$/, ['10-staff-access']],
  ],
  laundromat: [
    [/^\/dashboard\/laundry\/items\/?$/, ['01-set-your-prices']],
    [/^\/dashboard\/laundry\/new\/?$/, ['02-take-an-order', '03-express-discount-total']],
    [/^\/dashboard\/laundry\/overview\/?$/, ['10-overview']],
    [/^\/dashboard\/laundry\/deliveries\/?$/, ['06-delivery-riders']],
    [/^\/dashboard\/laundry\/[^/]+\/(slip|tag)\/?$/, ['05-slip-and-tags']],
    [/^\/dashboard\/laundry\/?$/, ['04-track-the-order']],
    [/^\/dashboard\/laundry\/[^/]+\/?$/, ['04-track-the-order']],
    [/^\/dashboard\/customers(\/.*)?$/, ['07-customers-balances']],
    [/^\/dashboard\/expenses\/?$/, ['08-expenses']],
    [/^\/dashboard\/staffs\/?$/, ['09-staff-access']],
  ],
};

// A page that has no video of its own shows no "Watch how" button (only the small icon that opens the full list).
// Pages with no video today: billing, settings, approvals, stores, transfers, referrals, repairs, deliveries, swaps.

// the videos for the page you are on (an empty list when there is none). Each video says which set it is in (`set`).
// The business's own videos come first; a page they do not cover falls back to the "More features" videos this business has.
export function videosForPath(setId, pathname, type) {
  const set = SETS[setId];
  const rule = (RULES[setId] || []).find(([pattern]) => pattern.test(pathname));
  const own = set && rule ? rule[1].map((key) => set.videos.find((v) => v.key === key)).filter(Boolean).map((v) => ({ ...v, set: setId })) : [];
  if (own.length > 0) return own;
  // a phone shop's Repairs pages use the repair videos
  if (type === 'phone_shop' && pathname.startsWith('/dashboard/repairs')) {
    const repairRule = RULES.repair.find(([pattern]) => pattern.test(pathname));
    const repairs = repairRule ? repairRule[1].map((key) => SETS.repair.videos.find((v) => v.key === key)).filter(Boolean).map((v) => ({ ...v, set: 'repair' })) : [];
    if (repairs.length > 0) return repairs;
  }
  const general = GENERAL_RULES.find(([pattern]) => pattern.test(pathname));
  if (!general) return [];
  return generalVideosForType(type).filter((v) => general[1].includes(v.key));
}

function fileName(setId, key, shape) {
  return `LogBase-${SETS[setId].file}-${key}-${shape === 'wide' ? 'Wide-16x9' : 'Vertical-9x16'}`;
}

// shape: 'vertical' (phones) or 'wide' (computers)
export function videoUrl(setId, key, shape) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${FOLDER}/${fileName(setId, key, shape)}.mp4`;
}

// a small picture taken from the video, shown before it plays
export function posterUrl(setId, key, shape) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_3,w_640,f_jpg/${FOLDER}/${fileName(setId, key, shape)}.jpg`;
}

export function youtubeIdFor(setId, key) {
  return YOUTUBE_IDS[`${setId}/${key}`] || '';
}
