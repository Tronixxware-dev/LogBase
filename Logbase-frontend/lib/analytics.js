// Turns the raw lists (products, sales, purchases) into the numbers shown on the Overview page.
// Pure functions only: no fetching and no React in here.

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function idOf(ref) {
  if (!ref) return '';
  return String(typeof ref === 'object' ? ref._id : ref);
}

// What one unit of a product (or one of its colours / sizes) cost the business.
function unitCost(product, variantId) {
  if (!product) return null;
  if (variantId && Array.isArray(product.variants)) {
    const variant = product.variants.find((v) => String(v._id) === String(variantId));
    if (variant && variant.costPrice != null) return num(variant.costPrice);
  }
  return num(product.costPrice);
}

function unitPrice(product, variant) {
  if (variant && variant.sellingPrice != null) return num(variant.sellingPrice);
  return num(product.sellingPrice);
}

export const STOCK_STATUS = {
  out: 'Out of stock',
  low: 'Low stock',
  ok: 'In stock',
};

export function stockStatusOf(product) {
  const qty = num(product.quantity);
  if (qty <= 0) return 'out';
  if (qty <= num(product.reorderThreshold)) return 'low';
  return 'ok';
}

// Everything about what is on the shelves right now (not affected by the date range).
function buildStock(products) {
  const totals = { units: 0, costValue: 0, retailValue: 0, ok: 0, low: 0, out: 0 };
  const byCategory = new Map();
  const needsRestock = [];

  for (const p of products) {
    const qty = num(p.quantity);
    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;

    let costValue = 0;
    let retailValue = 0;
    if (hasVariants) {
      for (const v of p.variants) {
        const q = num(v.quantity);
        costValue += q * (v.costPrice != null ? num(v.costPrice) : num(p.costPrice));
        retailValue += q * unitPrice(p, v);
      }
    } else {
      costValue = qty * num(p.costPrice);
      retailValue = qty * num(p.sellingPrice);
    }

    const status = stockStatusOf(p);
    totals.units += qty;
    totals.costValue += costValue;
    totals.retailValue += retailValue;
    totals[status] += 1;

    const category = (p.category || '').trim() || 'Uncategorised';
    const row = byCategory.get(category) || { label: category, units: 0, products: 0, costValue: 0 };
    row.units += qty;
    row.products += 1;
    row.costValue += costValue;
    byCategory.set(category, row);

    if (status !== 'ok') {
      needsRestock.push({
        _id: p._id,
        name: p.name,
        quantity: qty,
        threshold: num(p.reorderThreshold),
        status,
      });
    }
  }

  // largest categories first; anything past the 6th is folded into "Other"
  let categories = Array.from(byCategory.values()).sort((a, b) => b.units - a.units);
  if (categories.length > 7) {
    const rest = categories.slice(6);
    categories = categories.slice(0, 6).concat({
      label: `Other (${rest.length})`,
      units: rest.reduce((s, c) => s + c.units, 0),
      products: rest.reduce((s, c) => s + c.products, 0),
      costValue: rest.reduce((s, c) => s + c.costValue, 0),
    });
  }

  // empty shelves first, then the ones closest to running out
  needsRestock.sort((a, b) => (a.status === b.status ? a.quantity - b.quantity : a.status === 'out' ? -1 : 1));

  return { totals, categories, needsRestock };
}

// `losses` (administrator only): what stock that was written off cost the business, as [{ date, amount }].
// It comes from damaged / lost / expired / stolen stock and from returned goods that were not put back on the shelf.
//
// `expenses` (administrator only): money spent on rent, salaries and so on, as [{ date, amount, category }].
// It is taken off the profit to give the net profit.
export function buildAnalytics({ products = [], sales = [], purchases = [], losses = [], returns = [], expenses = [], days = 30 }) {
  const today = startOfDay(new Date());
  const start = new Date(today.getTime() - (days - 1) * DAY);
  const end = new Date(today.getTime() + DAY); // exclusive
  const inRange = (value) => {
    const t = new Date(value).getTime();
    return t >= start.getTime() && t < end.getTime();
  };

  const productById = new Map(products.map((p) => [String(p._id), p]));

  // one entry per day so quiet days show as zero instead of being skipped
  const daily = [];
  const dailyIndex = new Map();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start.getTime() + i * DAY);
    const row = { date, sales: 0, purchases: 0 };
    dailyIndex.set(dayKey(date), row);
    daily.push(row);
  }

  /* ---- sales ---- */
  const salesIn = sales.filter((s) => inRange(s.date));
  let revenue = 0;
  let collected = 0;
  let soldUnits = 0;
  let knownRevenue = 0;
  let knownCost = 0;
  let deliveryTotal = 0; // what the business paid to deliver goods to customers
  let deliveryCount = 0;
  let inboundDeliveryTotal = 0; // what the business paid to have purchased goods delivered to it
  let inboundDeliveryCount = 0;
  const saleIds = new Set();
  const topMap = new Map();
  const methodMap = new Map();

  for (const s of salesIn) {
    const total = num(s.totalAmount);
    const qty = num(s.quantity);
    // a line whose goods all came back is not a sale any more
    if (qty <= 0 && num(s.returnedQuantity) > 0) continue;
    revenue += total;
    collected += num(s.amountPaid);
    soldUnits += qty;
    saleIds.add(s.saleGroup ? String(s.saleGroup) : String(s._id));

    // the fee sits on the first line of a multi-item sale, so adding it up here never counts it twice
    if (s.deliveryPaidByUs && num(s.deliveryCost) > 0) {
      deliveryTotal += num(s.deliveryCost);
      deliveryCount += 1;
    }

    const row = dailyIndex.get(dayKey(s.date));
    if (row) row.sales += total;

    const product = productById.get(idOf(s.product));
    const cost = unitCost(product, s.variant);
    if (cost != null) {
      knownRevenue += total;
      knownCost += cost * qty;
    }

    const pid = idOf(s.product);
    const name = (s.product && s.product.name) || (product && product.name) || 'Deleted product';
    const top = topMap.get(pid) || { label: name, units: 0, revenue: 0 };
    top.units += qty;
    top.revenue += total;
    topMap.set(pid, top);

    const method = s.paymentMethod || 'other';
    methodMap.set(method, (methodMap.get(method) || 0) + total);
  }

  /* ---- purchases ---- */
  const purchasesIn = purchases.filter((p) => inRange(p.date));
  let spend = 0;
  let receivedUnits = 0;
  const purchaseIds = new Set();
  for (const p of purchasesIn) {
    spend += num(p.totalCost);
    receivedUnits += num(p.quantity);
    purchaseIds.add(p.purchaseGroup ? String(p.purchaseGroup) : String(p._id));
    // the fee sits on the first line of a multi-item purchase, so adding it up here never counts it twice
    if (p.deliveryPaidByUs && num(p.deliveryCost) > 0) {
      inboundDeliveryTotal += num(p.deliveryCost);
      inboundDeliveryCount += 1;
    }
    const row = dailyIndex.get(dayKey(p.date));
    if (row) row.purchases += num(p.totalCost);
  }

  // stock written off in the period (damaged, lost, returned goods that could not be sold again...)
  let lossTotal = 0;
  for (const l of losses) {
    if (l && inRange(l.date)) lossTotal += num(l.amount);
  }

  // money spent on running the business in the period (rent, salaries, transport...)
  let expenseTotal = 0;
  let expenseCount = 0;
  const expenseMap = new Map();
  for (const e of expenses) {
    if (e && inRange(e.date)) {
      expenseTotal += num(e.amount);
      expenseCount += 1;
      expenseMap.set(e.category || 'other', (expenseMap.get(e.category || 'other') || 0) + num(e.amount));
    }
  }
  const expenseByCategory = Array.from(expenseMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // goods customers brought back in the period (their money is already out of revenue above)
  let returnedValue = 0;
  let returnedCount = 0;
  for (const r of returns) {
    if (r && inRange(r.date)) {
      returnedValue += num(r.totalValue);
      returnedCount += 1;
    }
  }

  const methods = Array.from(methodMap.entries())
    .map(([method, value]) => ({ label: method.charAt(0).toUpperCase() + method.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  const topProducts = Array.from(topMap.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5);

  return {
    days,
    range: { start, end: today },
    daily,
    summary: {
      revenue,
      collected,
      owed: Math.max(0, revenue - collected),
      salesCount: saleIds.size,
      soldUnits,
      // profit only counts sales of products that still exist, so a deleted product cannot fake a profit.
      // Delivery fees the business paid (to customers and on purchases) and stock that was written off are always taken off.
      profit: knownRevenue - knownCost - deliveryTotal - inboundDeliveryTotal - lossTotal,
      // what written-off stock cost (already taken off the profit)
      lossTotal,
      // running costs, and what is left of the profit after them
      expenseTotal,
      expenseCount,
      netProfit: knownRevenue - knownCost - deliveryTotal - inboundDeliveryTotal - lossTotal - expenseTotal,
      returnedValue,
      returnedCount,
      // everything paid for delivery, and the two parts it is made of
      deliveryCost: deliveryTotal + inboundDeliveryTotal,
      deliveryCount: deliveryCount + inboundDeliveryCount,
      salesDeliveryCost: deliveryTotal,
      salesDeliveryCount: deliveryCount,
      purchaseDeliveryCost: inboundDeliveryTotal,
      purchaseDeliveryCount: inboundDeliveryCount,
      spend,
      purchaseCount: purchaseIds.size,
      receivedUnits,
    },
    expenseByCategory,
    methods,
    topProducts,
    stock: buildStock(products),
  };
}

// Every unit that came in (a purchase, a return put back on the shelf, stock found) or went out (a sale,
// stock damaged or lost), newest first, for the Stock activities page.
// `days` limits it to the last N days (today included); leave it out for everything ever recorded.
// Sale lines show what was originally sold (the returns that took units back are listed on their own),
// so adding up "in" and "out" always matches what happened on the shelf.
// kind: 'out' (sale), 'in' (purchase), 'return', 'adjust'.
export function buildActivity({ sales = [], purchases = [], returns = [], adjustments = [], days = null } = {}) {
  let inRange = () => true;
  if (days) {
    const start = startOfDay(new Date()).getTime() - (days - 1) * DAY;
    inRange = (value) => new Date(value).getTime() >= start;
  }

  const returnRows = [];
  for (const r of returns) {
    if (!inRange(r.date)) continue;
    (r.items || []).forEach((item, index) => {
      returnRows.push({
        kind: 'return',
        rowKey: `return-${r._id}-${index}`,
        id: String(item.sale),
        date: r.date,
        createdAt: r.createdAt,
        product: item.productName || 'Deleted product',
        variant: item.variantLabel || '',
        quantity: num(item.quantity),
        // units that did not go back on the shelf do not add to stock
        stockChange: item.restocked ? num(item.quantity) : 0,
        restocked: Boolean(item.restocked),
        amount: num(item.value),
        party: r.customerName || '',
        by: r.processedByName || '',
        note: r.reason || '',
      });
    });
  }

  return [
    ...sales
      .filter((s) => inRange(s.date))
      .map((s) => {
        const quantity = num(s.quantity) + num(s.returnedQuantity);
        return {
          kind: 'out',
          id: s._id,
          date: s.date,
          createdAt: s.createdAt,
          product: (s.product && s.product.name) || 'Deleted product',
          variant: s.variantLabel || '',
          quantity,
          stockChange: -quantity,
          amount: num(s.totalAmount) + num(s.returnedAmount),
          party: s.customerName || (s.customer && s.customer.name) || '',
          by: s.sellerName || '',
        };
      }),
    ...purchases
      .filter((p) => inRange(p.date))
      .map((p) => ({
        kind: 'in',
        id: p._id,
        date: p.date,
        createdAt: p.createdAt,
        product: (p.product && p.product.name) || 'Deleted product',
        variant: p.variantLabel || '',
        quantity: num(p.quantity),
        stockChange: num(p.quantity),
        amount: num(p.totalCost),
        party: p.supplierName || (p.supplier && p.supplier.name) || '',
        by: p.purchasedBy || '',
      })),
    ...returnRows,
    ...adjustments
      .filter((a) => inRange(a.date))
      .map((a) => ({
        kind: 'adjust',
        id: a._id,
        date: a.date,
        createdAt: a.createdAt,
        product: a.productName || 'Deleted product',
        variant: a.variantLabel || '',
        quantity: Math.abs(num(a.change)),
        stockChange: num(a.change),
        amount: a.costValue == null ? null : Math.abs(num(a.costValue)),
        party: '',
        by: a.createdByName || '',
        note: a.type || '',
        noteText: a.note || '',
      })),
  ].sort((a, b) => {
    const byDate = new Date(b.date) - new Date(a.date);
    return byDate !== 0 ? byDate : new Date(b.createdAt) - new Date(a.createdAt);
  });
}
