// What the product form suggests and shows as example text, for each kind of business, so the form talks about the
// things that business really sells (iPhone models and storage for a phone shop, spare parts for a workshop, cloth for a tailor...).
// Everything here is only help while typing: the person can always type something else.

// ---------------------------------------------------------------------------------------------
// Phones, tablets, laptops and accessories
// ---------------------------------------------------------------------------------------------

const APPLE = 'Apple';
const SAMSUNG = 'Samsung';

const IPHONES = [
  'iPhone 18 Pro Max', 'iPhone 18 Pro',
  'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 17e',
  'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e',
  'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
  'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
  'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
  'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
  'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
  'iPhone SE (3rd generation)', 'iPhone SE (2nd generation)',
  'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X', 'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
].map((name) => ({ name, brand: APPLE }));

const SAMSUNGS = [
  'Galaxy S26 Ultra', 'Galaxy S26+', 'Galaxy S26',
  'Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S25', 'Galaxy S25 FE',
  'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S24 FE',
  'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S22 Ultra', 'Galaxy S21 Ultra',
  'Galaxy Z Fold7', 'Galaxy Z Flip7', 'Galaxy Z Fold6', 'Galaxy Z Flip6', 'Galaxy Z Fold5', 'Galaxy Z Flip5',
  'Galaxy A56', 'Galaxy A36', 'Galaxy A26', 'Galaxy A16', 'Galaxy A06',
  'Galaxy A55', 'Galaxy A35', 'Galaxy A25', 'Galaxy A15', 'Galaxy A05s', 'Galaxy A05',
  'Galaxy A54', 'Galaxy A34', 'Galaxy A24', 'Galaxy A14', 'Galaxy A04', 'Galaxy A53', 'Galaxy A52', 'Galaxy A32', 'Galaxy A22', 'Galaxy A13', 'Galaxy A12',
  'Galaxy Note 20 Ultra', 'Galaxy Note 10+',
  'Galaxy Tab S10', 'Galaxy Tab S9', 'Galaxy Tab A9+', 'Galaxy Tab A9',
  'Galaxy Watch 8', 'Galaxy Watch 7', 'Galaxy Buds3 Pro', 'Galaxy Buds FE',
].map((name) => ({ name: `Samsung ${name}`, brand: SAMSUNG }));

function series(brand, names) {
  return names.map((name) => ({ name: `${brand} ${name}`, brand }));
}

const OTHER_PHONES = [
  ...series('Tecno', ['Spark 40', 'Spark 40 Pro', 'Spark 30', 'Spark 30C', 'Spark 20 Pro', 'Spark 20', 'Spark 10', 'Spark Go 2', 'Camon 40', 'Camon 30', 'Camon 20', 'Camon 19', 'Pova 7', 'Pova 6', 'Pova 5', 'Phantom V Fold']),
  ...series('Infinix', ['Hot 60i', 'Hot 50', 'Hot 40', 'Hot 30', 'Hot 20', 'Note 50', 'Note 40', 'Note 30', 'Smart 9', 'Smart 8', 'Smart 7', 'Zero 40', 'Zero 30', 'GT 30 Pro']),
  ...series('Itel', ['A70', 'A60s', 'A60', 'P55+', 'P55', 'S24', 'S23', 'City 100']),
  ...series('Xiaomi', ['Redmi 14C', 'Redmi 13C', 'Redmi 12', 'Redmi Note 14', 'Redmi Note 13', 'Redmi Note 12', 'Poco X7', 'Poco X6', 'Poco C75', '15', '14']),
  ...series('Google', ['Pixel 10 Pro', 'Pixel 10', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 7']),
  ...series('Oppo', ['Reno 13', 'Reno 12', 'A58', 'A38', 'A18']),
  ...series('Vivo', ['V40', 'Y28', 'Y18', 'Y17s']),
  ...series('OnePlus', ['13', '12', 'Nord CE4']),
  ...series('Nokia', ['G42', 'C32']),
];

const TABLETS_AND_WEARABLES = [
  'iPad Pro 13-inch', 'iPad Pro 11-inch', 'iPad Air 13-inch', 'iPad Air 11-inch', 'iPad (10th generation)', 'iPad (9th generation)', 'iPad mini',
  'Apple Watch Ultra 3', 'Apple Watch Series 11', 'Apple Watch Series 10', 'Apple Watch SE',
  'AirPods Pro 3', 'AirPods Pro 2', 'AirPods 4', 'AirPods Max',
  'Apple Pencil', 'MagSafe charger', 'Apple 20W USB-C power adapter',
].map((name) => ({ name, brand: APPLE }));

const LAPTOPS = [
  ...['MacBook Air 13-inch (M4)', 'MacBook Air 15-inch (M4)', 'MacBook Air 13-inch (M3)', 'MacBook Air (M2)', 'MacBook Air (M1)', 'MacBook Pro 14-inch (M4 Pro)', 'MacBook Pro 14-inch (M3)', 'MacBook Pro 16-inch (M4 Pro)', 'MacBook Pro 16-inch (M3 Pro)', 'MacBook Pro 13-inch (M2)'].map((name) => ({ name, brand: APPLE })),
  ...series('HP', ['EliteBook 840 G5', 'EliteBook 840 G6', 'EliteBook 840 G7', 'EliteBook 840 G8', 'EliteBook 830 G7', 'EliteBook x360 1030 G3', 'ProBook 450 G8', 'ProBook 440 G9', 'Pavilion 15', 'Spectre x360', 'Envy x360', 'Victus 15', 'Omen 16', '255 G8']),
  ...series('Dell', ['Latitude 5420', 'Latitude 5490', 'Latitude 7420', 'Latitude 7490', 'XPS 13', 'XPS 15', 'Inspiron 15', 'Inspiron 14', 'Vostro 15', 'Precision 5540', 'G15 Gaming']),
  ...series('Lenovo', ['ThinkPad T480', 'ThinkPad T490', 'ThinkPad T14', 'ThinkPad X1 Carbon', 'ThinkPad X270', 'ThinkPad L14', 'IdeaPad 3', 'IdeaPad Slim 3', 'Yoga Slim 7', 'Legion 5']),
  ...series('Asus', ['VivoBook 15', 'ZenBook 14', 'ROG Strix G16', 'TUF Gaming A15']),
  ...series('Acer', ['Aspire 5', 'Swift 3', 'Nitro 5']),
  ...series('Microsoft', ['Surface Pro 9', 'Surface Pro 8', 'Surface Laptop 5', 'Surface Go 3']),
];

const GAMING_AND_ACCESSORIES = [
  { name: 'PlayStation 5 Slim', brand: 'Sony' },
  { name: 'PlayStation 5 Pro', brand: 'Sony' },
  { name: 'PS5 DualSense controller', brand: 'Sony' },
  { name: 'PlayStation 4 Slim', brand: 'Sony' },
  { name: 'Xbox Series X', brand: 'Microsoft' },
  { name: 'Xbox Series S', brand: 'Microsoft' },
  { name: 'Nintendo Switch OLED', brand: 'Nintendo' },
  { name: 'Anker 20000mAh power bank', brand: 'Anker' },
  { name: 'Anker 65W fast charger', brand: 'Anker' },
  { name: 'Oraimo power bank 10000mAh', brand: 'Oraimo' },
  { name: 'Oraimo FreePods earbuds', brand: 'Oraimo' },
  { name: 'JBL Flip 6 Bluetooth speaker', brand: 'JBL' },
  { name: 'JBL Charge 5 Bluetooth speaker', brand: 'JBL' },
  { name: 'JBL Tune earbuds', brand: 'JBL' },
  { name: 'Fast charger 20W (USB-C)' },
  { name: 'USB-C to Lightning cable' },
  { name: 'USB-C to USB-C cable' },
  { name: 'Wireless charger 15W' },
  { name: 'Car charger' },
  { name: 'Phone case' },
  { name: 'Tempered glass screen protector' },
  { name: 'Laptop bag 15.6-inch' },
  { name: 'Wireless mouse' },
  { name: 'Flash drive 64GB' },
  { name: 'Memory card 128GB' },
  { name: 'External hard drive 1TB' },
  { name: 'Smart watch' },
];

const GADGET_NAMES = [...IPHONES, ...SAMSUNGS, ...OTHER_PHONES, ...TABLETS_AND_WEARABLES, ...LAPTOPS, ...GAMING_AND_ACCESSORIES];

const GADGET_BRANDS = ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Itel', 'Xiaomi', 'Google', 'Oppo', 'Vivo', 'OnePlus', 'Nokia', 'Huawei', 'Realme', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Sony', 'Nintendo', 'Anker', 'Oraimo', 'JBL', 'Baseus', 'Ugreen'];

const STORAGE = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const LAPTOP_SPECS = ['4GB / 128GB', '8GB / 256GB', '8GB / 512GB', '16GB / 256GB', '16GB / 512GB', '16GB / 1TB', '32GB / 512GB', '32GB / 1TB', '64GB / 2TB'];
const GADGET_COLOURS = [
  'Black', 'White', 'Silver', 'Gold', 'Blue', 'Green', 'Pink', 'Purple', 'Red', 'Yellow', 'Gray', 'Space Gray', 'Midnight', 'Starlight', 'Graphite', 'Rose Gold',
  'Natural Titanium', 'Black Titanium', 'White Titanium', 'Blue Titanium', 'Desert Titanium', 'Deep Blue', 'Cosmic Orange', 'Sage', 'Lavender', 'Mist Blue',
];

// ---------------------------------------------------------------------------------------------
// Spare parts (repair workshop)
// ---------------------------------------------------------------------------------------------

const REPAIR_MODELS = [
  ['iPhone 15', 'Apple'], ['iPhone 14', 'Apple'], ['iPhone 13', 'Apple'], ['iPhone 12', 'Apple'], ['iPhone 11', 'Apple'], ['iPhone XR', 'Apple'], ['iPhone X', 'Apple'], ['iPhone 8', 'Apple'],
  ['Samsung A54', 'Samsung'], ['Samsung A34', 'Samsung'], ['Samsung A14', 'Samsung'], ['Samsung A13', 'Samsung'], ['Samsung A12', 'Samsung'], ['Samsung A52', 'Samsung'], ['Samsung S23', 'Samsung'], ['Samsung S22', 'Samsung'], ['Samsung S21', 'Samsung'],
  ['Tecno Spark 10', 'Tecno'], ['Tecno Spark 20', 'Tecno'], ['Tecno Camon 19', 'Tecno'], ['Tecno Camon 20', 'Tecno'],
  ['Infinix Hot 30', 'Infinix'], ['Infinix Hot 20', 'Infinix'], ['Infinix Note 12', 'Infinix'], ['Infinix Smart 7', 'Infinix'],
  ['Itel A60', 'Itel'], ['Itel P40', 'Itel'], ['Redmi Note 12', 'Xiaomi'], ['Redmi 12', 'Xiaomi'],
];
const REPAIR_PARTS = ['Screen', 'Battery', 'Charging port', 'Back glass', 'Camera'];
const REPAIR_NAMES = [
  { name: 'Screen (LCD)' }, { name: 'Screen (OLED)' }, { name: 'Battery' }, { name: 'Charging port' }, { name: 'Back cover' }, { name: 'Loud speaker' },
  { name: 'Earpiece speaker' }, { name: 'Front camera' }, { name: 'Rear camera' }, { name: 'Power button flex' }, { name: 'Motherboard' }, { name: 'SIM tray' },
  { name: 'Tempered glass' }, { name: 'Soldering flux' }, { name: 'Screwdriver set' },
  ...REPAIR_MODELS.flatMap(([model, brand]) => REPAIR_PARTS.map((part) => ({ name: `${model} ${part}`, brand }))),
];

// ---------------------------------------------------------------------------------------------
// General shop / provisions
// ---------------------------------------------------------------------------------------------

const RETAIL_NAMES = [
  { name: 'Indomie noodles (carton)', brand: 'Indomie' }, { name: 'Indomie noodles (single)', brand: 'Indomie' },
  { name: 'Peak milk tin 400g', brand: 'Peak' }, { name: 'Peak milk sachet', brand: 'Peak' },
  { name: 'Milo 400g', brand: 'Nestlé' }, { name: 'Nescafé 50g', brand: 'Nestlé' },
  { name: 'Bournvita 450g', brand: 'Cadbury' }, { name: 'Golden Penny spaghetti', brand: 'Golden Penny' }, { name: 'Golden Penny semovita 1kg', brand: 'Golden Penny' },
  { name: 'Dangote sugar 500g', brand: 'Dangote' }, { name: 'Dangote salt 500g', brand: 'Dangote' }, { name: 'Dangote rice 50kg', brand: 'Dangote' },
  { name: 'Power Oil 5L', brand: 'Power Oil' }, { name: 'Kings vegetable oil 5L', brand: 'Kings' }, { name: 'Groundnut oil 1L' },
  { name: 'Maggi cubes (pack)', brand: 'Maggi' }, { name: 'Knorr cubes (pack)', brand: 'Knorr' }, { name: 'Tomato paste (tin)' },
  { name: 'Coca-Cola 50cl (crate)', brand: 'Coca-Cola' }, { name: 'Fanta 50cl (crate)', brand: 'Coca-Cola' }, { name: 'Sprite 50cl (crate)', brand: 'Coca-Cola' },
  { name: 'Bottled water 75cl (pack)' }, { name: 'Malt drink (pack)', brand: 'Maltina' }, { name: 'Hollandia yoghurt 1L', brand: 'Hollandia' },
  { name: 'Always sanitary pad', brand: 'Always' }, { name: 'Pampers diapers (pack)', brand: 'Pampers' },
  { name: 'Omo detergent 1kg', brand: 'Omo' }, { name: 'Ariel detergent 1kg', brand: 'Ariel' }, { name: 'Dettol soap', brand: 'Dettol' },
  { name: 'Geisha soap', brand: 'Geisha' }, { name: 'Close Up toothpaste', brand: 'Close Up' }, { name: 'Colgate toothpaste', brand: 'Colgate' },
  { name: 'Hypo bleach 1L', brand: 'Hypo' }, { name: 'Toilet roll (pack)' }, { name: 'Biscuits (carton)' }, { name: 'Candle (pack)' }, { name: 'Matches (pack)' },
  { name: 'Paracetamol 500mg (pack)' }, { name: 'Vitamin C (bottle)' }, { name: 'Hand sanitizer 500ml' },
];
const RETAIL_BRANDS = ['Indomie', 'Peak', 'Nestlé', 'Cadbury', 'Golden Penny', 'Dangote', 'Power Oil', 'Kings', 'Maggi', 'Knorr', 'Coca-Cola', 'Maltina', 'Hollandia', 'Always', 'Pampers', 'Omo', 'Ariel', 'Dettol', 'Geisha', 'Close Up', 'Colgate', 'Unilever', 'Procter & Gamble'];
const RETAIL_SIZES = ['Small', 'Medium', 'Large', '50cl', '75cl', '1L', '1.5L', '5L', '25L', '100g', '200g', '400g', '500g', '1kg', '5kg', '10kg', '25kg', '50kg', 'Single', 'Pack', 'Dozen', 'Carton'];

// ---------------------------------------------------------------------------------------------
// Cloth, notions and ready-made clothes (tailor / fashion designer)
// ---------------------------------------------------------------------------------------------

const TAILOR_NAMES = [
  { name: 'Ankara fabric (6 yards)' }, { name: 'Ankara fabric (12 yards)' }, { name: 'Lace fabric (5 yards)' }, { name: 'French lace (5 yards)' }, { name: 'Cord lace' },
  { name: 'Aso-oke (set)' }, { name: 'Guinea brocade (5 yards)' }, { name: 'Senator material (4 yards)' }, { name: 'Atiku material' }, { name: 'Kampala' }, { name: 'Adire fabric' },
  { name: 'Damask' }, { name: 'Chiffon' }, { name: 'Satin' }, { name: 'Velvet' }, { name: 'Tulle' }, { name: 'Swiss voile (5 yards)' }, { name: 'Cashmere' }, { name: 'Linen' },
  { name: 'Cotton (per yard)' }, { name: 'Lining material' }, { name: 'Interfacing' }, { name: 'Zip' }, { name: 'Buttons (pack)' }, { name: 'Sewing thread' }, { name: 'Beads' }, { name: 'Stones and sequins' },
  { name: 'Ankara gown (ready-made)' }, { name: 'Senator set (ready-made)' }, { name: 'Kaftan (ready-made)' }, { name: 'Agbada (ready-made)' }, { name: 'Iro and buba (ready-made)' },
  { name: 'Shirt (ready-made)' }, { name: 'Trouser (ready-made)' }, { name: 'Cap (fila)' }, { name: 'Gele (headtie)' }, { name: 'Wrapper (pair)' },
];
const TAILOR_BRANDS = ['Vlisco', 'Hitarget', 'Da Viva', 'Atamfa', 'Hollandais', 'Real Wax', 'Super Wax', 'Embroidery'];
const TAILOR_SIZES = ['1 yard', '2 yards', '4 yards', '5 yards', '6 yards', '12 yards', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free size'];
const TAILOR_COLOURS = ['Red', 'Wine', 'Blue', 'Royal blue', 'Sky blue', 'Green', 'Teal', 'Yellow', 'Gold', 'Orange', 'Pink', 'Purple', 'Cream', 'White', 'Black', 'Ash', 'Brown', 'Multi-colour'];

// ---------------------------------------------------------------------------------------------
// One set of hints per kind of business
// ---------------------------------------------------------------------------------------------

const HINTS = {
  phone_shop: {
    namePlaceholder: 'iPhone 15 Pro Max',
    nameHint: 'Start typing a phone, laptop or accessory and pick it from the list.',
    skuPlaceholder: 'IP15PM-256-BLK',
    brandPlaceholder: 'e.g. Apple, Samsung, Tecno',
    colourPlaceholder: 'Colour: Black',
    sizePlaceholder: 'Storage: 128GB',
    sizeLabel: 'Storage',
    variantTitle: 'This product comes in different storage sizes or colours',
    variantHint: 'Each storage size / colour gets its own stock count, so you always know what is left.',
    nameOptions: GADGET_NAMES,
    brandOptions: GADGET_BRANDS,
    colourOptions: GADGET_COLOURS,
    sizeOptions: [...STORAGE, ...LAPTOP_SPECS],
  },
  retail: {
    namePlaceholder: 'Peak milk tin 400g',
    nameHint: '',
    skuPlaceholder: 'MILK-400G',
    brandPlaceholder: 'e.g. Peak, Dangote, Indomie',
    colourPlaceholder: 'Colour: Red',
    sizePlaceholder: 'Size: 400g',
    sizeLabel: 'Size',
    variantTitle: 'This product comes in different sizes or flavours',
    variantHint: 'Each size / flavour gets its own stock count, so you always know what is left.',
    nameOptions: RETAIL_NAMES,
    brandOptions: RETAIL_BRANDS,
    colourOptions: ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Original', 'Strawberry', 'Vanilla', 'Chocolate'],
    sizeOptions: RETAIL_SIZES,
  },
  repair: {
    namePlaceholder: 'iPhone 11 screen (OLED)',
    nameHint: 'Type a model or a part (screen, battery, charging port...) and pick it from the list.',
    skuPlaceholder: 'SCR-IP11',
    brandPlaceholder: 'e.g. Apple, Samsung, Tecno',
    colourPlaceholder: 'Colour: Black',
    sizePlaceholder: 'Quality: OEM',
    sizeLabel: 'Quality',
    variantTitle: 'This part comes in different qualities or colours',
    variantHint: 'Each quality / colour gets its own stock count, so you always know what is left.',
    nameOptions: REPAIR_NAMES,
    brandOptions: GADGET_BRANDS,
    colourOptions: ['Black', 'White', 'Blue', 'Gold', 'Silver', 'Green', 'Red', 'Pink'],
    sizeOptions: ['Original', 'OEM', 'Copy (AAA)', 'Refurbished', 'Used', 'Incell', 'OLED', 'LCD'],
  },
  tailor: {
    namePlaceholder: 'Ankara fabric (6 yards)',
    nameHint: 'Cloth, sewing materials or a ready-made outfit: start typing and pick it from the list.',
    skuPlaceholder: 'ANK-6Y-RED',
    brandPlaceholder: 'e.g. Vlisco, Hitarget, Da Viva',
    colourPlaceholder: 'Colour: Wine',
    sizePlaceholder: 'Size: 6 yards',
    sizeLabel: 'Length / size',
    variantTitle: 'This product comes in different colours, lengths or sizes',
    variantHint: 'Each colour / length / size gets its own stock count, so you always know what is left.',
    nameOptions: TAILOR_NAMES,
    brandOptions: TAILOR_BRANDS,
    colourOptions: TAILOR_COLOURS,
    sizeOptions: TAILOR_SIZES,
  },
};

// A laundromat does not keep products, so anything unknown gets the general shop hints.
export function hintsFor(type) {
  return HINTS[type] || HINTS.retail;
}

// When a name is chosen from the list (or typed exactly), the brand that goes with it: "iPhone 15" -> "Apple".
export function brandForName(type, name) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return '';
  const found = hintsFor(type).nameOptions.find((o) => o.name.toLowerCase() === wanted);
  return found && found.brand ? found.brand : '';
}
