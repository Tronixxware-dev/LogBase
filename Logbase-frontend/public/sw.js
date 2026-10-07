/* LogBase service worker: makes the app open without internet.
 *
 *  - Files the app is built from (/_next/static/...) never change for a given address, so they are kept and reused.
 *  - Pages are always asked from the server first (so you see the latest). If the server cannot be reached, or is
 *    very slow, the last saved copy of that page is shown instead. A page's HTML is only the empty frame of the
 *    page (no business data in it); the data comes from the app's own saved copy on the device.
 *  - Nothing else is touched: requests to the API and to other websites go straight through.
 *
 * Change VERSION to throw away everything this worker saved.
 */
const VERSION = 'v1';
const STATIC = `logbase-static-${VERSION}`;
const PAGES = `logbase-pages-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const SLOW_MS = 4000; // when a saved page exists, wait this long for the server before using it
const MAX_STATIC = 500;
const MAX_PAGES = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC);
        await cache.addAll([OFFLINE_URL, '/icons/icon-192.png']);
      } catch (err) {
        // the fallback page could not be saved this time; the worker still works
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => (n.startsWith('logbase-') || n.startsWith('logg-') || n.startsWith('loggr-')) && n !== STATIC && n !== PAGES).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// Keeps a cache from growing for ever: the oldest entries go first.
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

function isBuildFile(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    cache
      .put(request, response.clone())
      .then(() => trim(STATIC, MAX_STATIC))
      .catch(() => {});
  }
  return response;
}

function pageKey(url) {
  const u = new URL(url);
  u.hash = '';
  return u.href;
}

async function savedPage(cache, request) {
  const url = new URL(request.url);
  let hit = await cache.match(pageKey(request.url), { ignoreVary: true });
  if (!hit) hit = await cache.match(url.origin + url.pathname, { ignoreVary: true, ignoreSearch: true });
  // the bare address redirects to the dashboard
  if (!hit && url.pathname === '/') hit = await cache.match(url.origin + '/dashboard', { ignoreVary: true });
  return hit || null;
}

async function pageRequest(request) {
  const cache = await caches.open(PAGES);

  const network = fetch(request).then((response) => {
    if (response.status >= 500) throw new Error('server error');
    if (response.ok && response.type === 'basic') {
      cache
        .put(pageKey(request.url), response.clone())
        .then(() => trim(PAGES, MAX_PAGES))
        .catch(() => {});
    }
    return response;
  });
  network.catch(() => {}); // when the saved copy wins the race, a later failure is not a problem

  const saved = await savedPage(cache, request);
  if (!saved) {
    try {
      return await network;
    } catch (err) {
      const offline = await caches.match(OFFLINE_URL);
      return offline || Response.error();
    }
  }

  try {
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), SLOW_MS)),
    ]);
  } catch (err) {
    return saved;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  if (isBuildFile(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(pageRequest(request));
  }
  // anything else (the app's own data requests...) is not handled here
});

/* ---- saving pages ahead of time ---- */

// every /_next/static/... address mentioned in a page or a stylesheet
function buildFilesIn(text) {
  const found = new Set();
  const pattern = /\/_next\/static\/[A-Za-z0-9_\-./%~@+\[\]]+\.(?:js|css|woff2?|ttf|otf|png|svg|ico|json)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) found.add(match[0].replace(/\\\//g, '/'));
  return found;
}

async function saveBuildFile(path, statics, seen) {
  if (seen.has(path)) return;
  seen.add(path);
  if (await statics.match(path)) return;
  try {
    const response = await fetch(path, { credentials: 'same-origin' });
    if (!response.ok || response.type !== 'basic') return;
    // a stylesheet names its fonts
    if (path.endsWith('.css')) {
      const css = await response.clone().text();
      for (const inner of buildFilesIn(css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (m, u) => u.startsWith('/') ? ` ${u}` : ` /_next/static/${u.replace(/^(\.\.\/)+/, '')}`))) {
        await saveBuildFile(inner, statics, seen);
      }
    }
    await statics.put(path, response);
  } catch (err) {
    // one missing file must not stop the rest
  }
}

async function warm(paths) {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  const seen = new Set();
  const assets = new Set();
  let savedPages = 0;

  for (const path of paths.slice(0, 40)) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) continue;
    try {
      const response = await fetch(path, { headers: { Accept: 'text/html' }, credentials: 'same-origin', redirect: 'manual' });
      if (!response.ok || response.type !== 'basic') continue;
      const html = await response.clone().text();
      await pages.put(new URL(path, self.location.origin).href, response);
      savedPages += 1;
      buildFilesIn(html).forEach((f) => assets.add(f));
    } catch (err) {
      // offline, or this page does not exist: skip it
    }
  }

  const list = Array.from(assets);
  for (let i = 0; i < list.length; i += 6) {
    await Promise.all(list.slice(i, i + 6).map((f) => saveBuildFile(f, statics, seen)));
  }
  await trim(PAGES, MAX_PAGES);
  await trim(STATIC, MAX_STATIC);

  const clients = await self.clients.matchAll();
  clients.forEach((c) => c.postMessage({ type: 'WARM_DONE', pages: savedPages, files: seen.size }));
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'WARM' && Array.isArray(data.urls)) event.waitUntil(warm(data.urls));
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});
