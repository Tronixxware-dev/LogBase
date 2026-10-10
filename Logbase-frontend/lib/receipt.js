// Receipts and customer statements: the numbers and the text sent on WhatsApp. Pure functions, no React.

import { formatMoney } from '@/lib/format';
import { phoneKey } from '@/lib/phone';

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((num(value) + Number.EPSILON) * 100) / 100;
}

function itemName(line) {
  const name = (line.product && line.product.name) || 'Item';
  return line.variantLabel ? `${name} (${line.variantLabel})` : name;
}

// The receipt for one sale. `lines` are every line of the sale (one, or all lines of a multi-item sale).
// Quantities and prices are what was sold; returns are listed as their own lines, and the totals are what
// the customer ends up paying for.
export function buildReceipt({ sale, lines }) {
  const all = lines && lines.length > 0 ? lines : [sale];
  const items = all.map((line) => {
    const returned = num(line.returnedQuantity);
    return {
      id: line._id,
      name: itemName(line),
      quantity: num(line.quantity) + returned,
      unitPrice: num(line.unitPrice),
      amount: round2(num(line.totalAmount) + num(line.returnedAmount)),
      returnedQuantity: returned,
      returnedAmount: round2(num(line.returnedAmount)),
      // the units the customer still has, and the warranty on them
      serials: Array.isArray(line.serials) ? line.serials : [],
      warrantyMonths: num(line.warrantyMonths),
      warrantyEndsAt: num(line.quantity) > 0 && line.warrantyEndsAt ? line.warrantyEndsAt : null,
    };
  });

  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  const returned = round2(items.reduce((s, i) => s + i.returnedAmount, 0));
  const total = round2(all.reduce((s, l) => s + num(l.totalAmount), 0));
  const paid = round2(all.reduce((s, l) => s + num(l.amountPaid), 0));
  const first = all[0];
  const key = String(first.saleGroup || first._id || '');

  return {
    number: key.slice(-6).toUpperCase(),
    date: first.date || first.createdAt,
    customerName: first.customerName || (first.customer && first.customer.name) || sale.customerName || 'Walk-in',
    customerPhone: (first.customer && first.customer.phone) || (sale.customer && sale.customer.phone) || '',
    servedBy: first.sellerName || '',
    paymentMethod: first.paymentMethod || '',
    items,
    subtotal,
    returned,
    total,
    paid,
    balance: round2(Math.max(total - paid, 0)),
    hasWarranty: items.some((i) => i.warrantyEndsAt),
  };
}

// The same receipt as plain text, for WhatsApp or SMS.
export function receiptText(receipt, businessName) {
  const lines = [];
  lines.push(`*${businessName || 'Receipt'}*`);
  lines.push(`Receipt #${receipt.number}`);
  if (receipt.date) lines.push(receiptDateTime(receipt.date));
  if (receipt.customerName) lines.push(`Customer: ${receipt.customerName}`);
  lines.push('');
  for (const item of receipt.items) {
    lines.push(`${item.quantity} x ${item.name} @ ${formatMoney(item.unitPrice)} = ${formatMoney(item.amount)}`);
    if (item.serials.length > 0) lines.push(`   IMEI / serial: ${item.serials.join(', ')}`);
    if (item.warrantyEndsAt) lines.push(`   Warranty until ${new Date(item.warrantyEndsAt).toLocaleDateString()}`);
    if (item.returnedQuantity > 0) {
      lines.push(`   returned ${item.returnedQuantity}: -${formatMoney(item.returnedAmount)}`);
    }
  }
  lines.push('');
  lines.push(`*Total: ${formatMoney(receipt.total)}*`);
  lines.push(`Paid: ${formatMoney(receipt.paid)}${receipt.paymentMethod ? ` (${receipt.paymentMethod})` : ''}`);
  if (receipt.balance > 0) lines.push(`*Still owed: ${formatMoney(receipt.balance)}*`);
  lines.push('');
  if (receipt.hasWarranty) lines.push('Keep this receipt: it is your proof of purchase for the warranty.');
  lines.push('Thank you for your business!');
  return lines.join('\n');
}

// "10/10/2026, 6:48 PM"
export function receiptDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${d.toLocaleDateString()}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

// A statement as plain text.
export function statementText(statement, businessName) {
  const lines = [];
  lines.push(`*${businessName || 'Statement'}*`);
  lines.push(`Account statement for ${statement.customer.name}`);
  lines.push(new Date().toLocaleDateString());
  lines.push('');
  const recent = statement.entries.slice(-8);
  if (statement.entries.length > recent.length) lines.push('(latest entries)');
  for (const e of recent) {
    const when = e.date ? new Date(e.date).toLocaleDateString() : '';
    const amount = e.debit > 0 && e.credit > 0 ? `${formatMoney(e.debit)} / ${formatMoney(e.credit)}` : formatMoney(e.debit || e.credit);
    lines.push(`${when} ${e.description} (${amount})`.trim());
  }
  lines.push('');
  if (statement.balance > 0) lines.push(`Balance owed: ${formatMoney(statement.balance)}`);
  else if (statement.balance < 0) lines.push(`Store credit: ${formatMoney(-statement.balance)}`);
  else lines.push('Balance: nothing owed');
  return lines.join('\n');
}

// A link that opens WhatsApp (the app on a phone, WhatsApp Web on a computer) with the text already typed in.
// With no valid phone number it opens WhatsApp's own chooser instead.
// (api.whatsapp.com/send is the address wa.me itself forwards to; going there directly keeps the text on phones.)
export function whatsappLink(phone, text) {
  const digits = phoneKey(phone);
  const query = `${digits ? `phone=${digits}&` : ''}text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
  return `https://api.whatsapp.com/send?${query}`;
}
