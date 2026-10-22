// The bell and the menu badges: the person's latest alerts and how many requests wait for an answer.
// One shared copy is kept fresh every minute (and when the page comes back into view), whoever is looking at it.

import { useSyncExternalStore } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api';

const EMPTY = { unread: 0, pendingApprovals: 0, items: [], loaded: false };
let state = EMPTY;
const listeners = new Set();
let timer = null;
let busy = false;

function set(next) {
  state = next;
  listeners.forEach((l) => l());
}

export async function refreshAlerts() {
  if (busy) return;
  busy = true;
  try {
    const data = await listNotifications({ limit: 20 });
    set({ unread: data.unread || 0, pendingApprovals: data.pendingApprovals || 0, items: data.notifications || [], loaded: true });
  } catch {
    // offline or signed out: keep what is shown
  } finally {
    busy = false;
  }
}

function onVisible() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') refreshAlerts();
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refreshAlerts();
    timer = setInterval(refreshAlerts, 60000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('logbase:alerts-changed', refreshAlerts);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('logbase:alerts-changed', refreshAlerts);
      state = EMPTY; // the next person to sign in on this screen starts clean
    }
  };
}

export function useAlerts() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// Marks one alert read, straight away on screen
export async function readAlert(id) {
  set({ ...state, items: state.items.map((n) => (n._id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)), unread: Math.max(0, state.unread - (state.items.some((n) => n._id === id && !n.readAt) ? 1 : 0)) });
  try {
    await markNotificationRead(id);
  } catch {
    refreshAlerts();
  }
}

export async function readAllAlerts() {
  set({ ...state, unread: 0, items: state.items.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })) });
  try {
    await markAllNotificationsRead();
  } catch {
    refreshAlerts();
  }
}

// Ask every open screen to look again (after approving something, for example)
export function alertsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('logbase:alerts-changed'));
}

// How each kind of alert looks: an icon and a soft colour (colour names are remapped for the dark theme in globals.css)
export const ALERT_STYLE = {
  approvals: { icon: 'approve', chip: 'bg-amber-50 text-amber-700' },
  lowStock: { icon: 'alert', chip: 'bg-red-50 text-red-700' },
  creditSale: { icon: 'credit', chip: 'bg-violet-50 text-violet-700' },
  customerPayment: { icon: 'wallet', chip: 'bg-green-50 text-green-700' },
  returns: { icon: 'returns', chip: 'bg-rose-50 text-rose-700' },
  stockAdjustments: { icon: 'adjust', chip: 'bg-sky-50 text-sky-700' },
  transfers: { icon: 'transfer', chip: 'bg-teal-50 text-teal-700' },
  jobReady: { icon: 'check', chip: 'bg-teal-50 text-teal-700' },
};
export const DEFAULT_ALERT_STYLE = { icon: 'bell', chip: 'bg-gray-100 text-gray-600' };
