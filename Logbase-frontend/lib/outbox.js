// Sales recorded while there is no internet. A sale is saved in the outbox on the device (with its photos),
// kept in order, and sent by syncOutbox() as soon as the server can be reached.
//
// Safety rules:
//  * Every sale has its own id, sent with it. The server records a sale with a given id only once, so a sale that
//    was sent but whose answer was lost is never recorded twice.
//  * The sale keeps the time it was made (not the time it was sent), the stock is taken on the server when it
//    arrives, and a sale the server refuses (not enough stock, an IMEI already sold...) is kept, marked "failed",
//    with the reason, until someone looks at it. It is never thrown away silently.
//  * A sale is only sent by the person who made it (it is recorded under their name), so sales waiting on a shared
//    phone wait for their own person to sign in.
//  * One send at a time (also across browser tabs), oldest sale first.

import { createCustomer, createSale, listCustomers } from '@/lib/api';
import { outboxAll, outboxDelete, outboxGet, outboxPut, cacheGet, cachePut } from '@/lib/offline';
import { phoneKey } from '@/lib/phone';

export const SYNCED_EVENT = 'logbase:sales-synced';

// 'sale_' + 32 random hex characters (the server accepts letters, digits, _ and -, 8 to 64 long).
// crypto.randomUUID only exists on secure (https) pages, so the older getRandomValues is used when needed.
export function newClientId() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  let hex = '';
  if (c && typeof c.randomUUID === 'function') {
    hex = c.randomUUID().replace(/-/g, '');
  } else if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    for (let i = 0; i < 32; i += 1) hex += Math.floor(Math.random() * 16).toString(16);
  }
  return `sale_${hex}`;
}

export function userKey(user) {
  return user ? String(user.id || user._id || '') : '';
}

// A short description for the Pending sales page: what was sold, to whom, for how much.
export function describeSale(payload, products, customerName) {
  const items = (payload.items || []).map((item) => {
    const product = (products || []).find((p) => p._id === item.product);
    const variant = product && item.variant ? (product.variants || []).find((v) => v._id === item.variant) : null;
    const name = product ? product.name : 'Item';
    const label = variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : '';
    return { name: label ? `${name} (${label})` : name, quantity: Number(item.quantity) || 0, total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) };
  });
  return { customerName: customerName || '', total: items.reduce((sum, i) => sum + i.total, 0), items };
}

// Saves a sale in the outbox. Resolves with the saved entry; rejects if the device could not store it
// (the caller must then tell the person the sale was NOT saved).
//   clientId     the sale's id. Use the same id the first (online) try used, so a sale that did reach the server
//                before the connection dropped is recognised and not recorded twice. Made here when not given.
//   madeAt       when the sale was made (ISO). The sale keeps this time.
//   payload      what createSale sends (items, amountPaid, paymentMethod, delivery...) without customer / date / clientId
//   photos       File objects
//   customer     a saved customer { _id, name }, or null
//   newCustomer  { name, phone, address } when the customer does not exist yet (created when the sale is sent)
export async function queueSale({ user, clientId, madeAt, payload, photos = [], customer = null, newCustomer = null, summary }) {
  if (!customer && !newCustomer) throw new Error('A sale needs a customer');
  const id = clientId || newClientId();
  const createdAt = madeAt || new Date().toISOString();
  const entry = {
    id,
    userId: userKey(user),
    userName: (user && user.name) || '',
    createdAt,
    status: 'pending',
    error: '',
    attempts: 0,
    customerId: customer ? customer._id : '',
    newCustomer: customer ? null : newCustomer,
    payload: { ...payload, clientId: id, date: createdAt, ...(customer ? { customer: customer._id, customerName: customer.name } : { customerName: newCustomer.name }) },
    photos: Array.from(photos || []).map((file) => ({ name: file.name || 'photo.jpg', type: file.type || 'image/jpeg', blob: file })),
    summary: summary || { customerName: customer ? customer.name : newCustomer.name, total: 0, items: [] },
  };
  await outboxPut(entry);
  return entry;
}

export async function listQueue() {
  return outboxAll();
}

// The photos are stored as plain records holding the picture data, and turned back into files when the sale is sent.
function photoFiles(photos) {
  return (photos || []).map((p) => new File([p.blob], p.name, { type: p.type }));
}

// How many sales are waiting for this person, how many of those were refused, and how many belong to other people.
export async function queueCounts(user) {
  const all = await outboxAll();
  const key = userKey(user);
  const mine = all.filter((e) => e.userId === key);
  return {
    pending: mine.filter((e) => e.status === 'pending').length,
    failed: mine.filter((e) => e.status === 'failed').length,
    others: all.filter((e) => e.userId !== key).length,
    othersNames: Array.from(new Set(all.filter((e) => e.userId !== key).map((e) => e.userName).filter(Boolean))),
  };
}

export async function removeEntry(id) {
  await outboxDelete(id);
}

// Puts a refused sale back in line to be tried again.
export async function retryEntry(id) {
  const entry = await outboxGet(id);
  if (!entry) return null;
  await outboxPut({ ...entry, status: 'pending', error: '', attempts: 0 });
  return id;
}

// The product list the sale form uses is kept on the device; after a sale is saved offline, take its items off the
// saved stock numbers so the next sale in the same offline stretch sees what is really left.
export function takeOffStock(products, items) {
  const next = (products || []).map((p) => ({ ...p, variants: (p.variants || []).map((v) => ({ ...v })) }));
  for (const item of items || []) {
    const product = next.find((p) => p._id === item.product);
    if (!product) continue;
    const qty = Number(item.quantity) || 0;
    product.quantity = Math.max(0, (Number(product.quantity) || 0) - qty);
    if (item.variant) {
      const variant = product.variants.find((v) => v._id === item.variant);
      if (variant) variant.quantity = Math.max(0, (Number(variant.quantity) || 0) - qty);
    }
  }
  return next;
}

export async function applyLocalStock(items) {
  try {
    const copy = await cacheGet('/products');
    if (!copy || !copy.data || !Array.isArray(copy.data.products)) return;
    await cachePut('/products', { ...copy.data, products: takeOffStock(copy.data.products, items) });
  } catch {
    // the numbers are only a convenience
  }
}

/* ------------------------------------------------------------------ */
/* Sending                                                            */
/* ------------------------------------------------------------------ */

let running = false;

// Only one send at a time, in this tab and across tabs (Web Locks), so a sale is never sent by two tabs at once.
async function exclusive(fn) {
  if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
    return navigator.locks.request('logbase-outbox-sync', { ifAvailable: true }, async (lock) => (lock ? fn() : null));
  }
  if (running) return null;
  running = true;
  try {
    return await fn();
  } finally {
    running = false;
  }
}

// A customer who did not exist when the sale was made: create them now, or find them if the number is saved already
// (for example, a first try created them and then lost the connection).
async function ensureCustomer(entry) {
  if (entry.customerId) return entry;
  const info = entry.newCustomer;
  let customerId = '';
  try {
    const created = await createCustomer({ name: info.name, phone: info.phone, address: info.address || undefined });
    customerId = created.customer._id;
  } catch (err) {
    if (err.status !== 409) throw err;
    const data = await listCustomers();
    const found = (data.customers || []).find((c) => phoneKey(c.phone) === phoneKey(info.phone));
    if (!found) throw err;
    customerId = found._id;
  }
  const updated = { ...entry, customerId, payload: { ...entry.payload, customer: customerId } };
  await outboxPut(updated); // remembered, so a later try does not create them again
  return updated;
}

// Sends the waiting sales of this user, oldest first.
// Returns { sent, failed, remaining, stopped }: stopped is why it stopped early
// ('offline' | 'auth' | 'server' | null), and null (the whole result) when another send was already running.
export async function syncOutbox(user) {
  const key = userKey(user);
  if (!key) return { sent: 0, failed: 0, remaining: 0, stopped: null };

  const result = await exclusive(async () => {
    const summary = { sent: 0, failed: 0, remaining: 0, stopped: null };
    const entries = (await outboxAll()).filter((e) => e.userId === key && e.status === 'pending');

    for (let i = 0; i < entries.length; i += 1) {
      let entry = entries[i];
      try {
        entry = await ensureCustomer(entry);
        await createSale(entry.payload, photoFiles(entry.photos));
        await outboxDelete(entry.id);
        summary.sent += 1;
      } catch (err) {
        if (err.offline) {
          summary.stopped = 'offline';
        } else if (err.status === 401) {
          summary.stopped = 'auth'; // signed out: they are sent when this person signs in again
        } else if (err.status === 429 || err.status >= 500 || err.status === undefined) {
          summary.stopped = 'server'; // not the sale's fault: try again later
        } else {
          // the server looked at this sale and said no: keep it, with the reason, and go on to the next one
          await outboxPut({ ...entry, status: 'failed', error: err.message || 'The sale was refused', attempts: (entry.attempts || 0) + 1 });
          summary.failed += 1;
          continue;
        }
        break;
      }
    }

    summary.remaining = (await outboxAll()).filter((e) => e.userId === key && e.status === 'pending').length;
    return summary;
  });

  if (result && result.sent > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: { count: result.sent } }));
  }
  return result;
}
