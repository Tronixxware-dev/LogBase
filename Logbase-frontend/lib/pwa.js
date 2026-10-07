// Making LogBase an installable app that opens without internet: registers the service worker (public/sw.js),
// asks it to save the main pages while there is internet, and handles the "Install" button.
//
// The service worker is only used in the production build (npm run build, then npm start). During
// `npm run dev` it is switched off (and removed), because a saved copy of the pages would get in the way of live reloading.

const WARM_KEY = 'logbase_warm_at';
const DISMISS_KEY = 'logbase_install_dismissed';
const WARM_EVERY_MS = 12 * 60 * 60 * 1000;

// The pages worth having on the device. (Pages with an id in the address, like one product, are saved when opened.)
export const WARM_ROUTES = [
  '/dashboard',
  '/dashboard/sales',
  '/dashboard/sales/new',
  '/dashboard/sales/pending',
  '/dashboard/products',
  '/dashboard/customers',
  '/dashboard/stock',
  '/dashboard/serials',
  '/dashboard/purchases',
  '/dashboard/purchases/new',
  '/dashboard/profile',
];

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not worth failing for
  }
}

export function serviceWorkerSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

// Called once when the app opens.
export async function registerServiceWorker() {
  if (!serviceWorkerSupported()) return null;

  if (process.env.NODE_ENV !== 'production') {
    // remove a worker left over from a production build, so development shows live pages
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
      if (typeof caches !== 'undefined') {
        const names = await caches.keys();
        await Promise.all(names.filter((n) => n.startsWith('logbase-') || n.startsWith('logg-') || n.startsWith('loggr-')).map((n) => caches.delete(n)));
      }
    } catch {
      // nothing to remove
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    // ask the browser not to delete the unsent sales when it is short of space
    if (navigator.storage && typeof navigator.storage.persist === 'function') navigator.storage.persist().catch(() => {});
    return registration;
  } catch {
    return null; // for example an http:// address that is not localhost: no offline pages, everything else works
  }
}

// Asks the worker to save the main pages (and what they need to open) now, while there is internet.
export async function warmUp({ force = false } = {}) {
  if (!serviceWorkerSupported() || process.env.NODE_ENV !== 'production') return false;
  const last = Number(storageGet(WARM_KEY) || 0);
  if (!force && Date.now() - last < WARM_EVERY_MS) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active || navigator.serviceWorker.controller;
    if (!worker) return false;
    worker.postMessage({ type: 'WARM', urls: WARM_ROUTES });
    storageSet(WARM_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Install button                                                     */
/* ------------------------------------------------------------------ */

let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone);
}

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// What the install card should do: 'prompt' (a button that installs), 'ios' (explain Share > Add to Home Screen) or null.
export function installMode() {
  if (isStandalone() || storageGet(DISMISS_KEY) === '1') return null;
  if (deferredPrompt) return 'prompt';
  if (isIos()) return 'ios';
  return null;
}

export function dismissInstall() {
  storageSet(DISMISS_KEY, '1');
  notify();
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  notify();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice && choice.outcome === 'accepted';
  } catch {
    return false;
  }
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own button, at a good moment
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}
