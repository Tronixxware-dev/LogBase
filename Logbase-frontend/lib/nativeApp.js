// LogBase also runs inside the Android / iPhone store apps (a thin wrapper around this website).
// The wrapper adds "LogBaseApp" to the browser's name, which is how the website knows it is inside the app.
// The store rules do not allow selling a subscription from inside a store app, so inside the app the plans,
// prices and Pay buttons are not shown. Everything else works the same.

import { useSyncExternalStore } from 'react';

export const NATIVE_APP_MARKER = 'LogBaseApp';

// true only inside the store app (always false on the server and in a normal browser)
export function isNativeApp() {
  return typeof navigator !== 'undefined' && String(navigator.userAgent || '').includes(NATIVE_APP_MARKER);
}

const subscribe = () => () => {};

// the same, for a screen: the first paint on the server says "no", then the app says "yes" without a hydration warning
export function useNativeApp() {
  return useSyncExternalStore(subscribe, isNativeApp, () => false);
}
