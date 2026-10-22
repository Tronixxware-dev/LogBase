'use client';

// The stores of the business and the one this person is working in. Loaded once and shared by every screen.

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { listShops } from '@/lib/api';
import { getActiveShopId, setActiveShopId, SHOP_EVENT, SHOPS_RESET_EVENT } from '@/lib/shopStorage';

let state = { shops: null, error: '', loading: false };
const listeners = new Set();
let inflight = null;

function emit(next) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function loadShops(force = false) {
  if (inflight && !force) return inflight;
  if (state.shops && !force) return Promise.resolve(state.shops);
  emit({ loading: true });
  inflight = listShops()
    .then((data) => {
      const shops = data.shops || [];
      // a saved store that was closed or deleted since: go back to the main store
      const saved = getActiveShopId();
      if (saved && !shops.some((s) => s._id === saved && s.isActive && !s.isMain)) setActiveShopId(null);
      emit({ shops, error: '', loading: false });
      return shops;
    })
    .catch((err) => {
      emit({ error: err.message, loading: false });
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Forget what was loaded (a different person signed in, or the stores changed)
export function resetShops() {
  state = { shops: null, error: '', loading: false };
  inflight = null;
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') window.addEventListener(SHOPS_RESET_EVENT, () => resetShops());

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener(SHOP_EVENT, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(SHOP_EVENT, listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => state;

// shops: the open stores (main first); active: the store this person is working in; multiple: the business has more than one open store.
export function useShops() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!snap.shops && !snap.loading && !snap.error) loadShops();
  }, [snap.shops, snap.loading, snap.error]);

  const all = snap.shops || [];
  const shops = all.filter((s) => s.isActive);
  const savedId = typeof window === 'undefined' ? null : getActiveShopId();
  const active = shops.find((s) => s._id === savedId) || shops.find((s) => s.isMain) || null;

  // choosing a store reloads the page, so every list on it is read again for that store
  const switchTo = useCallback((shop) => {
    setActiveShopId(shop && !shop.isMain ? shop._id : null);
    window.location.reload();
  }, []);

  const multiple = shops.length > 1;
  // The store whose records a list should show by default: the one being worked in, or everything when there is only one store.
  // `scopeId` matches records on the screen (see inShop); `scopeQuery` asks the server for just that store's records.
  const scopeId = multiple && active ? active._id : 'all';
  const scopeShop = multiple && active ? (active.isMain ? 'main' : active._id) : '';
  const scopeQuery = scopeShop ? `?shop=${scopeShop}` : '';
  // false until we know whether there are several stores (a list that asks the server for one store waits for this)
  const scopeReady = Boolean(snap.shops) || Boolean(snap.error);

  return { shops, allShops: all, active, multiple, scopeId, scopeShop, scopeQuery, scopeReady, ready: Boolean(snap.shops), error: snap.error, switchTo, reload: () => loadShops(true) };
}

// The name to show for a record's store: records of the main store carry no store name of their own.
export function storeNameOf(record, shops) {
  if (record && record.shopName) return record.shopName;
  const main = (shops || []).find((s) => s.isMain);
  return main ? main.name : 'Main store';
}

// Does a record (a sale, a purchase, an adjustment) belong to this store? Records of the main store carry no store id.
// `shopId` 'all' (or empty) matches everything.
export function inShop(record, shopId, shops) {
  if (!shopId || shopId === 'all') return true;
  const main = (shops || []).find((s) => s.isMain);
  const recordShop = record && record.shop ? String(record.shop._id || record.shop) : null;
  if (main && shopId === main._id) return !recordShop || recordShop === main._id;
  return recordShop === shopId;
}
