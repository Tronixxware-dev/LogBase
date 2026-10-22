// Which store this browser is working in. The choice is kept on this device (each person picks their own store), and the
// app sends it with every request (the X-Shop-Id header), so sales, purchases and stock changes land in that store.
// No saved store means the main store. No hooks in here, so lib/api.js can use it.

const KEY = 'logbase_shop';
const EVENT = 'logbase:shop-changed';

export function getActiveShopId() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

// null (or the main store's id, which the caller turns into null) means the main store.
export function setActiveShopId(id) {
  if (typeof window === 'undefined') return;
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // private windows can refuse storage: the main store is used then
  }
  window.dispatchEvent(new Event(EVENT));
}

export const SHOP_EVENT = EVENT;

// The saved copy of a list is kept per store, so going offline never shows another store's numbers.
export function scopedKey(path) {
  const id = getActiveShopId();
  return id ? `${path}#shop=${id}` : path;
}

// Products as the store the person works in has them: `quantity` is what THIS store holds (the server also sends the
// business total as `quantity`, and what the store holds as `shopQuantity`). Used by every screen that sells or counts stock.
export function forShop(products) {
  return (products || []).map((p) => ({
    ...p,
    totalQuantity: p.quantity,
    quantity: p.shopQuantity ?? p.quantity,
    variants: Array.isArray(p.variants) ? p.variants.map((v) => ({ ...v, totalQuantity: v.quantity, quantity: v.shopQuantity ?? v.quantity })) : p.variants,
  }));
}

export const SHOPS_RESET_EVENT = 'logbase:shops-reset';

// A different person signed in (or out): forget the saved store and what was loaded about the stores.
export function forgetShop() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to forget
  }
  window.dispatchEvent(new Event(SHOPS_RESET_EVENT));
}
