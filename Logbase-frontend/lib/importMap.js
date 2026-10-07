// Matching the columns of someone's file to LogBase's fields, and turning the rows into what the server expects.
// No React in here.

// aliases: other names a column may have in a file (compared with capitals, spaces and symbols removed)
export const PRODUCT_FIELDS = [
  { key: 'name', label: 'Product name', required: true, aliases: ['name', 'product', 'productname', 'item', 'itemname', 'title', 'description of goods'] },
  { key: 'sellingPrice', label: 'Selling price', required: true, aliases: ['sellingprice', 'price', 'sellprice', 'retailprice', 'unitprice', 'saleprice', 'sp', 'selling'] },
  { key: 'costPrice', label: 'Cost price', aliases: ['costprice', 'cost', 'buyingprice', 'purchaseprice', 'cp', 'buyprice', 'unitcost'] },
  { key: 'quantity', label: 'Quantity in stock', aliases: ['quantity', 'qty', 'stock', 'instock', 'openingstock', 'units', 'stockquantity', 'onhand'] },
  { key: 'reorderThreshold', label: 'Reorder level', aliases: ['reorderlevel', 'reorder', 'lowstock', 'minstock', 'minimum', 'reorderpoint', 'alertlevel'] },
  { key: 'sku', label: 'SKU / code', aliases: ['sku', 'code', 'productcode', 'itemcode', 'ref'] },
  { key: 'barcode', label: 'Barcode', aliases: ['barcode', 'upc', 'ean', 'gtin'] },
  { key: 'category', label: 'Category', aliases: ['category', 'type', 'group', 'department'] },
  { key: 'brand', label: 'Brand', aliases: ['brand', 'make', 'manufacturer'] },
  { key: 'description', label: 'Description', aliases: ['description', 'details'] },
];

export const CUSTOMER_FIELDS = [
  { key: 'name', label: 'Customer name', required: true, aliases: ['name', 'customer', 'customername', 'fullname', 'client', 'clientname'] },
  { key: 'phone', label: 'Phone number', aliases: ['phone', 'phonenumber', 'mobile', 'tel', 'telephone', 'whatsapp', 'contact', 'mobilenumber'] },
  { key: 'email', label: 'Email', aliases: ['email', 'emailaddress', 'mail'] },
  { key: 'address', label: 'Address', aliases: ['address', 'location', 'homeaddress'] },
  { key: 'balance', label: 'Amount owed', aliases: ['balance', 'owed', 'amountowed', 'outstanding', 'debt', 'openingbalance', 'owing', 'amountdue'] },
  { key: 'notes', label: 'Notes', aliases: ['notes', 'note', 'comment', 'comments', 'remarks'] },
];

export const KINDS = {
  products: { label: 'Products', noun: 'product', fields: PRODUCT_FIELDS },
  customers: { label: 'Customers', noun: 'customer', fields: CUSTOMER_FIELDS },
};

// "Selling Price (₦)" -> "sellingprice"
export function normalizeHeader(header) {
  return String(header || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// { fieldKey: columnIndex } with -1 for a field no column matches. A column is used for one field only.
export function autoMap(headers, fields) {
  const normalized = headers.map(normalizeHeader);
  const taken = new Set();
  const mapping = {};
  for (const field of fields) {
    const wanted = field.aliases.map(normalizeHeader);
    const index = normalized.findIndex((h, i) => !taken.has(i) && h !== '' && wanted.includes(h));
    mapping[field.key] = index;
    if (index >= 0) taken.add(index);
  }
  return mapping;
}

// "₦1,500.50" -> 1500.5; '' -> null; text that is not a number -> NaN
export function parseAmount(value) {
  const cleaned = String(value === undefined || value === null ? '' : value).replace(/[₦,\s]/g, '').replace(/^N(?=\d)/i, '');
  if (cleaned === '') return null;
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
}

// records: [{ line, cells }] (without the header). Rows whose mapped cells are all empty are dropped.
export function buildRows(records, mapping, fields) {
  const rows = [];
  for (const rec of records) {
    const row = { line: rec.line };
    let any = false;
    for (const field of fields) {
      const col = mapping[field.key];
      const raw = col >= 0 && col < rec.cells.length ? String(rec.cells[col]).trim() : '';
      if (raw !== '') any = true;
      row[field.key] = raw;
    }
    if (any) rows.push(row);
  }
  return rows;
}

// What is wrong with a row, judged in the browser before anything is sent ('' = looks fine).
// The server checks again and has the final say.
export function rowProblem(kind, row) {
  if (!String(row.name || '').trim()) return 'The name is empty';
  if (kind === 'products') {
    const price = parseAmount(row.sellingPrice);
    if (price === null) return 'The selling price is missing';
    if (Number.isNaN(price) || price < 0) return 'The selling price is not a valid amount';
    for (const [key, label] of [['costPrice', 'cost price']]) {
      const n = parseAmount(row[key]);
      if (n !== null && (Number.isNaN(n) || n < 0)) return `The ${label} is not a valid amount`;
    }
    for (const [key, label] of [['quantity', 'quantity'], ['reorderThreshold', 'reorder level']]) {
      const n = parseAmount(row[key]);
      if (n !== null && (Number.isNaN(n) || n < 0 || !Number.isInteger(n))) return `The ${label} must be a whole number, 0 or more`;
    }
  } else if (row.balance !== '' && Number.isNaN(parseAmount(row.balance))) {
    return 'The amount owed is not a valid number';
  }
  return '';
}

// A file to download and fill in
export function templateText(kind) {
  if (kind === 'customers') {
    return ['Name,Phone,Email,Address,Amount owed,Notes', 'Ada Obi,08031234567,ada@example.com,12 Allen Avenue Ikeja,5000,Pays on Fridays'].join('\r\n') + '\r\n';
  }
  return [
    'Name,SKU,Category,Brand,Cost price,Selling price,Quantity,Reorder level,Description',
    'iPhone 15 128GB,IP15-128,Phones,Apple,950000,1200000,5,2,Brand new and sealed',
  ].join('\r\n') + '\r\n';
}
