// The columns of every file the Import & export page can download. The product and customer columns use the same
// names the importer understands, so an exported file can be imported again (colours / sizes are not imported).

import { categoryLabel, dayInput, methodLabel } from '@/lib/expenses';
import { variantLabel } from '@/lib/format';

const day = (value) => (value ? dayInput(value) : '');

function nameOf(ref, fallback = 'Deleted product') {
  return (ref && typeof ref === 'object' && ref.name) || fallback;
}

export const PRODUCT_COLUMNS = [
  { label: 'Name', get: (p) => p.name },
  { label: 'SKU', get: (p) => p.sku },
  { label: 'Barcode', get: (p) => p.barcode },
  { label: 'Category', get: (p) => p.category },
  { label: 'Brand', get: (p) => p.brand },
  { label: 'Cost price', get: (p) => p.costPrice },
  { label: 'Selling price', get: (p) => p.sellingPrice },
  { label: 'Quantity', get: (p) => p.quantity },
  { label: 'Reorder level', get: (p) => p.reorderThreshold },
  {
    label: 'Colours / sizes',
    get: (p) => (p.variants || []).map((v) => `${variantLabel(v) || 'Standard'}: ${v.quantity}`).join('; '),
  },
  { label: 'Description', get: (p) => p.description },
];

export const CUSTOMER_COLUMNS = [
  { label: 'Name', get: (c) => c.name },
  { label: 'Phone', get: (c) => c.phone },
  { label: 'Email', get: (c) => c.email },
  { label: 'Address', get: (c) => c.address },
  { label: 'Amount owed', get: (c) => c.balance },
  { label: 'Notes', get: (c) => c.notes },
];

export const SALE_COLUMNS = [
  { label: 'Date', get: (s) => day(s.date) },
  { label: 'Customer', get: (s) => s.customerName || (s.customer && s.customer.name) || '' },
  { label: 'Product', get: (s) => nameOf(s.product) },
  { label: 'Colour / size', get: (s) => s.variantLabel },
  { label: 'Quantity', get: (s) => s.quantity },
  { label: 'Returned', get: (s) => s.returnedQuantity || 0 },
  { label: 'Unit price', get: (s) => s.unitPrice },
  { label: 'Total', get: (s) => s.totalAmount },
  { label: 'Paid', get: (s) => s.amountPaid },
  { label: 'Status', get: (s) => s.paymentStatus },
  { label: 'Paid by', get: (s) => methodLabel(s.paymentMethod) },
  { label: 'Sold by', get: (s) => s.sellerName },
  { label: 'Delivery paid by us', get: (s) => (s.deliveryPaidByUs ? s.deliveryCost : 0) },
];

export const PURCHASE_COLUMNS = [
  { label: 'Date', get: (p) => day(p.date) },
  { label: 'Product', get: (p) => nameOf(p.product) },
  { label: 'Colour / size', get: (p) => p.variantLabel },
  { label: 'Supplier', get: (p) => p.supplierName || (p.supplier && p.supplier.name) || '' },
  { label: 'Quantity', get: (p) => p.quantity },
  { label: 'Unit cost', get: (p) => p.costPricePerUnit },
  { label: 'Total cost', get: (p) => p.totalCost },
  { label: 'Delivery paid by us', get: (p) => (p.deliveryPaidByUs ? p.deliveryCost : 0) },
  { label: 'Received by', get: (p) => p.purchasedBy },
  { label: 'Batch', get: (p) => p.batchNumber },
];

export const EXPENSE_COLUMNS = [
  { label: 'Date', get: (e) => day(e.date) },
  { label: 'Category', get: (e) => categoryLabel(e.category) },
  { label: 'Note', get: (e) => e.description },
  { label: 'Amount', get: (e) => e.amount },
  { label: 'Paid by', get: (e) => methodLabel(e.paymentMethod) },
  { label: 'Added by', get: (e) => e.createdByName },
];

// Keeps only the rows whose date falls on or after `fromDay` ("2026-10-01"); no day = everything
export function sinceDay(rows, fromDay, getDate = (r) => r.date) {
  if (!fromDay) return rows;
  return rows.filter((r) => day(getDate(r)) >= fromDay);
}

export const todayStamp = () => dayInput();
