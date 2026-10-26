// One receipt format for the whole app. Every printed paper (sales receipt, laundry slip, repair slip, customer and
// supplier statements) is first described here as a plain "doc", then drawn the same way on the page
// (components/ReceiptPaper.js) and as a picture (lib/receiptImage.js): a narrow till roll, like a supermarket or
// chemist receipt. Pure functions, no React.
//
// A doc is { title, blocks }. The business name, logo, address lines, closing line and footer come from Settings.
// Block types:
//   { t: 'info',    rows: [[label, value], ...] }                       label on the left, value on the right
//   { t: 'rule',    solid?: true }                                      a dashed (or solid) line
//   { t: 'items',   items: [{ name, sub?, amount, notes?: [] }] }       a product / service line with its amount
//   { t: 'totals',  rows: [{ label, value, tone? }] }                   tone: 'muted' | 'big' | 'strong' | 'danger'
//   { t: 'text',    lines: [], align?: 'left' | 'center', tone?: 'muted', bold?: true, upper?: true }
//   { t: 'stamp',   text }                                              a boxed word such as PAID IN FULL
//   { t: 'barcode', code, label? }                                      decorative barcode drawn from the number

import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { serviceLabel } from '@/lib/laundry';
import { methodLabel } from '@/lib/jobs';
import { receiptDateTime } from '@/lib/receipt';

const rule = { t: 'rule' };

function showSeller(org) {
  return !org || !org.receipt || org.receipt.showSeller !== false;
}

// A sale (see buildReceipt in lib/receipt.js)
export function saleDoc(receipt) {
  const phone = describePhone(receipt.customerPhone).display;
  const count = receipt.items.reduce((n, i) => n + i.quantity, 0);

  const info = [
    ['Receipt #', receipt.number],
    ['Date', receiptDateTime(receipt.date)],
  ];
  if (receipt.servedBy) info.push(['Cashier', receipt.servedBy]);
  info.push(['Customer', receipt.customerName || 'Walk-in']);
  if (phone) info.push(['Phone', phone]);
  if (receipt.paymentMethod) info.push(['Payment', receipt.paymentMethod]);

  const items = receipt.items.map((item) => {
    const notes = [];
    if (item.serials.length > 0) notes.push(`IMEI / serial: ${item.serials.join(', ')}`);
    if (item.warrantyEndsAt) notes.push(`Warranty until ${formatDate(item.warrantyEndsAt)}`);
    if (item.returnedQuantity > 0) notes.push(`Returned ${item.returnedQuantity}: -${formatMoney(item.returnedAmount)}`);
    return { name: item.name, sub: `${item.quantity} @ ${formatMoney(item.unitPrice)}`, amount: formatMoney(item.amount), notes };
  });

  const totals = [];
  if (receipt.returned > 0) {
    totals.push({ label: 'Subtotal', value: formatMoney(receipt.subtotal), tone: 'muted' });
    totals.push({ label: 'Returned', value: `-${formatMoney(receipt.returned)}`, tone: 'muted' });
  }
  totals.push({ label: 'Total', value: formatMoney(receipt.total), tone: 'big' });
  if (receipt.tradeIn) {
    const t = receipt.tradeIn;
    totals.push({ label: `Item handed in: ${t.description}`, value: `-${formatMoney(t.credit)}` });
    if (t.imei) totals.push({ label: `IMEI / serial: ${t.imei}`, value: '', tone: 'muted' });
    totals.push({ label: 'Customer added', value: formatMoney(t.cashTopUp) });
    if (t.refund > 0) totals.push({ label: 'Given back', value: formatMoney(t.refund) });
  } else {
    totals.push({ label: 'Amount paid', value: formatMoney(receipt.paid) });
  }
  if (receipt.balance > 0) totals.push({ label: 'Balance due', value: formatMoney(receipt.balance), tone: 'danger' });

  const blocks = [
    { t: 'info', rows: info },
    rule,
    { t: 'items', items },
    rule,
    { t: 'totals', rows: totals },
    { t: 'text', lines: [`# ITEMS SOLD ${count}`], bold: true, align: 'left' },
  ];
  if (receipt.balance <= 0 && receipt.total > 0) blocks.push({ t: 'stamp', text: 'Paid in full' });
  blocks.push(rule, { t: 'barcode', code: receipt.number, label: 'TC#' });
  if (receipt.hasWarranty) blocks.push({ t: 'text', lines: ['Keep this receipt. It is your proof of purchase for the warranty.'], tone: 'muted', align: 'center' });
  return { title: 'Sales receipt', blocks };
}

// A laundry order
export function laundryDoc(order, org) {
  const phone = describePhone(order.customerPhone).display;
  const delivery = order.handover === 'delivery';

  const info = [
    ['Order #', order.code],
    ['Date in', formatDateTime(order.dateIn)],
  ];
  if (order.deliveryDate) info.push(['Date out', formatDate(order.deliveryDate)]);
  if (order.recordedByName && showSeller(org)) info.push(['Cashier', order.recordedByName]);
  info.push(['Customer', order.customerName]);
  if (phone) info.push(['Phone', phone]);
  info.push(['Hand-over', delivery ? `Delivery${order.deliveryAddress ? ` to ${order.deliveryAddress}` : ''}` : 'Pick-up']);
  if (order.express) info.push(['Speed', 'Express / same-day']);

  const items = order.lines.map((l) => {
    const notes = [];
    if (l.service && l.service !== 'wash') notes.push(serviceLabel(l.service));
    if (l.colour) notes.push(`Colour: ${l.colour}`);
    if (l.stain) notes.push(`Care: ${l.stain}`);
    if (l.remarks) notes.push(`Remarks: ${l.remarks}`);
    return { name: l.itemName, sub: `${l.quantity} @ ${formatMoney(l.price)}`, amount: formatMoney(l.quantity * l.price), notes };
  });

  const totals = [];
  const extras = order.deliveryFee > 0 || order.expressFee > 0 || order.discount > 0;
  if (extras) totals.push({ label: 'Items', value: formatMoney(order.subtotal), tone: 'muted' });
  if (order.express && order.expressFee > 0) totals.push({ label: `Express (+${order.expressPercent}%)`, value: formatMoney(order.expressFee), tone: 'muted' });
  if (order.discount > 0) totals.push({ label: `Discount${order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}`, value: `-${formatMoney(order.discount)}`, tone: 'muted' });
  if (order.deliveryFee > 0) totals.push({ label: 'Delivery fee', value: formatMoney(order.deliveryFee), tone: 'muted' });
  totals.push({ label: 'Total', value: formatMoney(order.totalAmount), tone: 'big' });
  totals.push({ label: 'Paid so far', value: formatMoney(order.amountPaid) });
  totals.push({ label: 'Balance due', value: order.balance > 0 ? formatMoney(order.balance) : 'Nil', tone: order.balance > 0 ? 'danger' : 'strong' });

  const blocks = [
    { t: 'info', rows: info },
    rule,
    { t: 'items', items },
    rule,
    { t: 'totals', rows: totals },
    { t: 'text', lines: [`# PIECES ${order.totalItems}`], bold: true, align: 'left' },
  ];
  if (order.balance <= 0 && order.totalAmount > 0) blocks.push({ t: 'stamp', text: 'Paid in full' });
  blocks.push(rule, { t: 'barcode', code: order.code, label: 'ORDER #' });
  blocks.push({
    t: 'text',
    lines: [delivery ? 'We will deliver your clothes to the address above. Please check your items when they arrive.' : 'Please bring this slip when you come for your clothes. Check your items before you leave.'],
    tone: 'muted',
    align: 'center',
  });
  return { title: 'Laundry slip', blocks };
}

// A repair job
export function repairDoc(repair, org) {
  const phone = describePhone(repair.customerPhone).display;
  const deposits = (repair.payments || []).filter((p) => p.kind === 'deposit');

  const info = [
    ['Job #', repair.code],
    ['Received', formatDateTime(repair.receivedAt)],
  ];
  if (repair.promisedDate) info.push(['Promised for', formatDate(repair.promisedDate)]);
  if (repair.recordedByName && showSeller(org)) info.push(['Cashier', repair.recordedByName]);
  info.push(['Customer', repair.customerName]);
  if (phone) info.push(['Phone', phone]);

  const device = [['Device', repair.device]];
  if (repair.imei) device.push(['IMEI / serial', repair.imei]);
  if (repair.accessories) device.push(['Left with it', repair.accessories]);

  const blocks = [
    { t: 'info', rows: info },
    rule,
    { t: 'info', rows: device },
    { t: 'text', lines: ['Fault reported'], tone: 'muted', upper: true, align: 'left', tight: true },
    { t: 'text', lines: [repair.fault], upper: true, align: 'left' },
    rule,
  ];

  if (repair.quote > 0) {
    const totals = [{ label: 'Repair price (quote)', value: formatMoney(repair.quote), tone: 'big' }];
    for (const d of deposits) totals.push({ label: `Deposit (${methodLabel(d.method)})`, value: formatMoney(d.amount), tone: 'muted' });
    totals.push({ label: 'Paid so far', value: formatMoney(repair.amountPaid) });
    totals.push({ label: 'Balance due', value: repair.balance > 0 ? formatMoney(repair.balance) : 'Nil', tone: repair.balance > 0 ? 'danger' : 'strong' });
    blocks.push({ t: 'totals', rows: totals });
    if (repair.balance <= 0) blocks.push({ t: 'stamp', text: 'Paid in full' });
  } else {
    blocks.push({ t: 'text', lines: ['The price will be confirmed after the fault is checked.'], align: 'left' });
    if (repair.amountPaid > 0) blocks.push({ t: 'totals', rows: [{ label: 'Deposit paid', value: formatMoney(repair.amountPaid) }] });
  }

  blocks.push(rule, { t: 'barcode', code: repair.code, label: 'JOB #' });
  blocks.push({ t: 'text', lines: ['Please bring this slip when you come for your device.'], tone: 'muted', align: 'center' });
  return { title: 'Repair job slip', blocks };
}

const CUSTOMER_TYPE = { sale: 'Sale', payment: 'Payment', return: 'Return', earlier: 'Earlier' };
const SUPPLIER_TYPE = { purchase: 'Purchase', payment: 'Payment', opening: 'Earlier' };

function entryItem(date, typeLabel, description, debit, credit, balance) {
  const notes = [];
  if (debit > 0 && credit > 0) notes.push(`Charged ${formatMoney(debit)}, paid ${formatMoney(credit)}`);
  notes.push(`Balance ${formatMoney(balance)}`);
  const net = Math.round((debit - credit) * 100) / 100;
  return {
    name: description,
    sub: [date ? formatDate(date) : '', typeLabel].filter(Boolean).join('  '),
    amount: formatMoney(net),
    notes,
  };
}

// A customer's account (see getCustomerStatement)
export function customerStatementDoc(statement) {
  const { customer, entries, balance } = statement;
  const phone = describePhone(customer.phone).display;
  const info = [['Customer', customer.name]];
  if (phone) info.push(['Phone', phone]);
  if (customer.address) info.push(['Address', customer.address]);
  info.push(['As at', formatDate(new Date())]);

  const blocks = [{ t: 'info', rows: info }, rule];
  if (entries.length === 0) {
    blocks.push({ t: 'text', lines: ['Nothing on this account yet.'], align: 'center', tone: 'muted' });
  } else {
    blocks.push({
      t: 'items',
      items: entries.map((e) => entryItem(e.date, CUSTOMER_TYPE[e.type] || e.type, String(e.description || '').replace(/^(Sale|Return): /, ''), e.debit, e.credit, e.balance)),
    });
  }
  blocks.push(rule, { t: 'totals', rows: [{ label: balance < 0 ? 'Store credit' : 'Balance owed', value: formatMoney(Math.abs(balance)), tone: balance > 0 ? 'danger' : 'big' }] });
  if (balance < 0) blocks.push({ t: 'text', lines: ['This is money the customer can use on their next purchase.'], tone: 'muted', align: 'center' });
  return { title: 'Account statement', blocks };
}

// A supplier's account (see getSupplierStatement)
export function supplierStatementDoc(statement) {
  const { supplier, entries, balance, totals } = statement;
  const phone = describePhone(supplier.phone).display;
  const info = [['Supplier', supplier.name]];
  if (phone) info.push(['Phone', phone]);
  if (supplier.address) info.push(['Address', supplier.address]);
  info.push(['As at', formatDate(new Date())]);

  const blocks = [{ t: 'info', rows: info }, rule];
  if (entries.length === 0) {
    blocks.push({ t: 'text', lines: ['Nothing on this account yet.'], align: 'center', tone: 'muted' });
  } else {
    blocks.push({
      t: 'items',
      items: entries.map((e) => entryItem(e.date, SUPPLIER_TYPE[e.type] || e.type, e.label, e.debit, e.credit, e.balance)),
    });
  }
  blocks.push(rule, {
    t: 'totals',
    rows: [
      { label: 'Goods received', value: formatMoney(totals.bought), tone: 'muted' },
      { label: 'Paid in total', value: formatMoney(totals.paid), tone: 'muted' },
      { label: 'You owe', value: formatMoney(balance), tone: balance > 0 ? 'danger' : 'big' },
    ],
  });
  return { title: 'Supplier account statement', blocks };
}

// Made-up figures for the picture in Settings > Organization
export function sampleDoc(org) {
  const info = [['Receipt #', 'A1B2C3'], ['Date', '10 Oct 2026, 6:48 PM']];
  if (showSeller(org)) info.push(['Cashier', 'Amaka']);
  info.push(['Customer', 'Walk-in']);
  return {
    title: 'Sales receipt',
    blocks: [
      { t: 'info', rows: info },
      rule,
      {
        t: 'items',
        items: [
          { name: 'Sample item', sub: `2 @ ${formatMoney(5000)}`, amount: formatMoney(10000), notes: [] },
          { name: 'Another item', sub: `1 @ ${formatMoney(2500)}`, amount: formatMoney(2500), notes: [] },
        ],
      },
      rule,
      {
        t: 'totals',
        rows: [
          { label: 'Total', value: formatMoney(12500), tone: 'big' },
          { label: 'Amount paid', value: formatMoney(12500) },
        ],
      },
      { t: 'text', lines: ['# ITEMS SOLD 3'], bold: true, align: 'left' },
      rule,
      { t: 'barcode', code: 'A1B2C3', label: 'TC#' },
    ],
  };
}
