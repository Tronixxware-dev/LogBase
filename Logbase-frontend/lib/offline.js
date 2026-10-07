// Things the app keeps on the device so it keeps working without internet: a copy of the pages' data
// (last seen) and the outbox of sales recorded while offline. Both live in IndexedDB because it can hold
// photos (files) and a lot of data, which localStorage cannot.
//
// If the browser has no IndexedDB (or it is blocked), nothing here throws: reading finds nothing and
// saving is skipped, and the app simply behaves as it did before offline mode existed.

const DB_NAME = 'logbase-offline';
const LEGACY_DB_NAMES = ['logg-offline', 'loggr-offline']; // the app's earlier names: sales still waiting there are moved over
const DB_VERSION = 1;
const CACHE = 'cache';
const OUTBOX = 'outbox';
const MAX_CACHE_ENTRIES = 300;

let dbPromise = null;

export function isSupported() {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

// Opens the database the app used before it was renamed, or gives null when there is none (it never creates one).
function openLegacy(name) {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(name);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      // it did not exist, so opening it started to create an empty one: undo that
      try {
        request.transaction.abort();
      } catch {
        // nothing to undo
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

// Moves the sales that were waiting under the old name into the current database, then removes the old one.
// Never fails: when anything goes wrong the old data stays where it is and the next start tries again
// (a sale sent twice is harmless, because the server recognises its id).
async function moveLegacyDatabase(db, name) {
  try {
    if (typeof indexedDB.databases === 'function') {
      const known = await indexedDB.databases();
      if (!known.some((d) => d.name === name)) return;
    }
    const old = await openLegacy(name);
    if (!old) return;
    try {
      let records = [];
      if (old.objectStoreNames.contains(OUTBOX)) {
        records = await new Promise((resolve, reject) => {
          const request = old.transaction(OUTBOX, 'readonly').objectStore(OUTBOX).getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }
      if (records.length > 0) {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(OUTBOX, 'readwrite');
          const store = transaction.objectStore(OUTBOX);
          records.forEach((record) => store.put(record));
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error || new Error('Could not move the saved sales'));
        });
      }
      old.close();
      await new Promise((resolve) => {
        const removal = indexedDB.deleteDatabase(name);
        removal.onsuccess = () => resolve();
        removal.onerror = () => resolve();
        removal.onblocked = () => resolve();
      });
    } catch {
      try {
        old.close();
      } catch {
        // already closed
      }
    }
  } catch {
    // leave the old data alone
  }
}

async function moveLegacyData(db) {
  for (const name of LEGACY_DB_NAMES) await moveLegacyDatabase(db, name);
}

function openDb() {
  if (!isSupported()) return Promise.reject(new Error('IndexedDB is not available'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        moveLegacyData(db).then(() => resolve(db));
      };
      request.onerror = () => reject(request.error || new Error('Could not open the offline storage'));
      request.onblocked = () => reject(new Error('The offline storage is busy'));
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// Runs fn(store) inside one transaction and resolves with the result of the request fn returns.
async function run(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    let result;
    try {
      const request = fn(transaction.objectStore(storeName));
      if (request && typeof request === 'object' && 'onsuccess' in request) {
        request.onsuccess = () => {
          result = request.result;
        };
      } else {
        result = request;
      }
    } catch (err) {
      reject(err);
      return;
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('The offline storage could not save this'));
  });
}

/* ------------------------------------------------------------------ */
/* Saved copy of what the server last said                            */
/* ------------------------------------------------------------------ */

export async function cacheGet(key) {
  try {
    const record = await run(CACHE, 'readonly', (store) => store.get(key));
    return record || null;
  } catch {
    return null;
  }
}

let writesSinceTrim = 0;

export async function cachePut(key, data) {
  try {
    await run(CACHE, 'readwrite', (store) => store.put({ key, data, savedAt: Date.now() }));
    writesSinceTrim += 1;
    if (writesSinceTrim >= 25) {
      writesSinceTrim = 0;
      await cacheTrim();
    }
  } catch {
    // saving a copy is a bonus; never a reason to fail
  }
}

// Keeps the newest MAX_CACHE_ENTRIES copies.
export async function cacheTrim(max = MAX_CACHE_ENTRIES) {
  try {
    const all = await run(CACHE, 'readonly', (store) => store.getAll());
    if (!all || all.length <= max) return 0;
    const oldest = all.sort((a, b) => a.savedAt - b.savedAt).slice(0, all.length - max);
    await run(CACHE, 'readwrite', (store) => {
      oldest.forEach((r) => store.delete(r.key));
    });
    return oldest.length;
  } catch {
    return 0;
  }
}

// Everything the server told us. Called when someone signs in or out, so the next person never sees it.
export async function cacheClear() {
  try {
    await run(CACHE, 'readwrite', (store) => store.clear());
  } catch {
    // nothing to clear
  }
}

/* ------------------------------------------------------------------ */
/* The outbox: sales waiting to be sent                               */
/* ------------------------------------------------------------------ */

export const OUTBOX_EVENT = 'logbase:outbox-changed';

function announce() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OUTBOX_EVENT));
}

// Unlike the saved copy, a failure here matters: the sale would be lost, so it is reported.
export async function outboxPut(entry) {
  await run(OUTBOX, 'readwrite', (store) => store.put(entry));
  announce();
  return entry;
}

export async function outboxGet(id) {
  try {
    return (await run(OUTBOX, 'readonly', (store) => store.get(id))) || null;
  } catch {
    return null;
  }
}

// Oldest first: sales are sent in the order they were made.
export async function outboxAll() {
  try {
    const all = await run(OUTBOX, 'readonly', (store) => store.getAll());
    return (all || []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  } catch {
    return [];
  }
}

export async function outboxDelete(id) {
  await run(OUTBOX, 'readwrite', (store) => store.delete(id));
  announce();
}
