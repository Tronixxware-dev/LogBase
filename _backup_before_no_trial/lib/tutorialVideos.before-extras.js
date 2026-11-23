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

export const SETS = {
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

// Which video sets each kind of business (see lib/businessTypes.js) can watch. A repair workshop has none yet.
const SETS_FOR_TYPE = {
  phone_shop: ['gadget'],
  retail: ['supermarket', 'pharmacy'],
  laundromat: ['laundromat'],
  tailor: ['tailoring'],
};

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

const RULES = {
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

// the videos for the page you are on (an empty list when there is none)
export function videosForPath(setId, pathname) {
  const set = SETS[setId];
  const rule = (RULES[setId] || []).find(([pattern]) => pattern.test(pathname));
  if (!set || !rule) return [];
  return rule[1].map((key) => set.videos.find((v) => v.key === key)).filter(Boolean);
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
