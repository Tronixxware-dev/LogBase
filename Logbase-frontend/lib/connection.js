// Is the server reachable right now? "Online" here means the browser says it is online AND the last request
// to the server got an answer. (A phone can be "online" with no signal; then requests fail, and we know.)
// Pages and the status strip listen to this; the app's request code reports into it.

const listeners = new Set();
let reachable = true;
let snapshot = { online: true };

function browserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function recompute() {
  const online = browserOnline() && reachable;
  if (online !== snapshot.online) {
    snapshot = { online };
    listeners.forEach((fn) => fn());
  }
}

// The same object until something changes (so it can be used with useSyncExternalStore)
export function getConnection() {
  const online = browserOnline() && reachable;
  if (online !== snapshot.online) snapshot = { online };
  return snapshot;
}

export function isOnline() {
  return getConnection().online;
}

// Called by the request code: true after any answer from the server, false after a request that could not get through.
export function markReachable(value) {
  if (reachable === value) return;
  reachable = value;
  recompute();
}

export function subscribeConnection(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    reachable = true; // the browser has a connection again: believe it until a request says otherwise
    recompute();
  });
  window.addEventListener('offline', recompute);
}
