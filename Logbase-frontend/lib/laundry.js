// The laundromat's words and sums: services, express, discount, the steps of a pick-up and of a delivery,
// and the WhatsApp messages. Pure functions, no React. (The server works the totals out again; these are for the screen.)

import { formatDate, formatMoney } from '@/lib/format';
import { whatsappLink } from '@/lib/receipt';

/* ------------------------------------------------------------------ */
/* Services                                                           */
/* ------------------------------------------------------------------ */

// What can be done to a piece. "Wash" uses the item's normal price; the others have a price of their own on each item.
export const SERVICES = [
  { value: 'wash', label: 'Wash' },
  { value: 'wash_iron', label: 'Wash & iron' },
  { value: 'iron', label: 'Iron only' },
  { value: 'dry_clean', label: 'Dry clean' },
];

export function serviceLabel(value) {
  const found = SERVICES.find((s) => s.value === (value || 'wash'));
  return found ? found.label : 'Wash';
}

// The usual price of one piece for a service (0 = the owner has not set it)
export function servicePrice(item, service) {
  if (!item) return 0;
  if (!service || service === 'wash') return Number(item.price) || 0;
  return Number(item.prices && item.prices[service]) || 0;
}

/* ------------------------------------------------------------------ */
/* Express and discount                                               */
/* ------------------------------------------------------------------ */

export const DEFAULT_EXPRESS_PERCENT = 50;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// subtotal, then the express charge on top, then the discount, then the delivery fee: the same order the server uses.
export function laundryTotals({ subtotal, express, expressPercent, discountType, discountValue, deliveryFee }) {
  const sub = round2(subtotal);
  const pct = express ? Number(expressPercent) || 0 : 0;
  const expressFee = express ? round2((sub * pct) / 100) : 0;
  const base = round2(sub + expressFee);
  const value = Number(discountValue) || 0;
  let discount = 0;
  if (discountType === 'percent') discount = round2((base * Math.min(value, 100)) / 100);
  else if (discountType === 'amount') discount = round2(value);
  const tooMuch = discount > base;
  if (tooMuch) discount = base;
  const fee = round2(deliveryFee);
  return { subtotal: sub, expressFee, discount, tooMuch, deliveryFee: fee, total: round2(base - discount + fee) };
}

/* ------------------------------------------------------------------ */
/* Steps: a pick-up and a delivery do not end the same way            */
/* ------------------------------------------------------------------ */

const PICKUP_STEPS = [
  { value: 'received', label: 'Received', tone: 'blue' },
  { value: 'processing', label: 'Being washed', tone: 'amber' },
  { value: 'ready', label: 'Ready for pick-up', tone: 'green' },
  { value: 'collected', label: 'Collected', tone: 'gray' },
];

const DELIVERY_STEPS = [
  { value: 'received', label: 'Received', tone: 'blue' },
  { value: 'processing', label: 'Being washed', tone: 'amber' },
  { value: 'ready', label: 'Ready for delivery', tone: 'green' },
  { value: 'out_for_delivery', label: 'Out for delivery', tone: 'blue' },
  { value: 'collected', label: 'Delivered', tone: 'gray' },
];

export function isDelivery(order) {
  return Boolean(order) && order.handover === 'delivery';
}

// The steps this order goes through, with the words that fit it
export function stepsFor(handoverOrOrder) {
  const handover = typeof handoverOrOrder === 'string' ? handoverOrOrder : handoverOrOrder && handoverOrOrder.handover;
  return handover === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS;
}

// { value, label, tone } of the order's current step
export function stepInfo(order) {
  const found = stepsFor(order).find((s) => s.value === order.status);
  return found || { value: order.status, label: order.status || '', tone: 'gray' };
}

/* ------------------------------------------------------------------ */
/* WhatsApp                                                           */
/* ------------------------------------------------------------------ */

function piecesText(order) {
  return `${order.totalItems} ${order.totalItems === 1 ? 'piece' : 'pieces'}`;
}

// The message for where the order is now. Returns { label, text }: the button's words and the text that opens in WhatsApp.
export function whatsappMessage(order, businessName) {
  const name = (order.customerName || '').split(' ')[0] || 'there';
  const sign = businessName ? `\n\nThank you,\n${businessName}` : '\n\nThank you.';
  const balance = order.balance > 0 ? `\nBalance to pay: ${formatMoney(order.balance)}` : '\nEverything is paid.';
  const delivery = isDelivery(order);

  if (order.status === 'ready') {
    if (delivery) {
      const fee = order.deliveryFee > 0 ? `\nDelivery fee: ${formatMoney(order.deliveryFee)} (already in the total)` : '';
      return {
        label: 'Tell the customer it is ready',
        text: `Hello ${name}, your laundry ${order.code} (${piecesText(order)}) is ready and will be delivered to ${order.deliveryAddress || 'your address'}.${fee}${balance}${sign}`,
      };
    }
    return {
      label: 'Tell the customer it is ready',
      text: `Hello ${name}, your laundry ${order.code} (${piecesText(order)}) is ready for pick-up.${balance}\nPlease bring your slip.${sign}`,
    };
  }
  if (order.status === 'out_for_delivery') {
    const rider = order.riderName ? `${order.riderName}${order.riderPhone ? ` (${order.riderPhone})` : ''}` : 'our rider';
    return {
      label: 'Tell the customer it is on the way',
      text: `Hello ${name}, your laundry ${order.code} is on its way to you with ${rider}.${balance}${sign}`,
    };
  }
  if (order.status === 'collected') {
    return {
      label: 'Send a thank-you',
      text: `Hello ${name}, thank you for choosing us. Your laundry ${order.code} has been ${delivery ? 'delivered' : 'handed over'}. We hope to see you again.${sign}`,
    };
  }
  const promised = order.deliveryDate ? ` It will be ready on ${formatDate(order.deliveryDate)}.` : '';
  return {
    label: 'Message the customer',
    text: `Hello ${name}, we have received your laundry ${order.code} (${piecesText(order)}).${promised}${balance}${sign}`,
  };
}

export function whatsappUrlFor(order, businessName) {
  return whatsappLink(order.customerPhone, whatsappMessage(order, businessName).text);
}
