// LogBase also runs inside the Android / iPhone store apps (a thin wrapper around this website).
// The wrapper adds "LogBaseApp" to the browser's name, which is how the website knows it is inside the app.
// Both store apps are "consumption only": people register and pay for a plan on the website (mylogbase.com), then log in
// to the app and get what their plan includes. The app sells nothing, so inside it the plans, prices and Pay buttons are
// not shown. Everything else works the same.
//
// Google Play Billing for Android is built (lib/googleBilling.js, utils/googlePlay.js on the server) but switched off.
// To sell plans inside the Android app, set ANDROID_PLAY_BILLING to true, add the @capgo/native-purchases plugin to
// Logbase-mobile and set up the subscriptions in Google Play Console.

import { useSyncExternalStore } from 'react';

const ANDROID_PLAY_BILLING = false;

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

// true only inside the Android store app
export function isAndroidApp() {
  if (!isNativeApp()) return false;
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (cap && typeof cap.getPlatform === 'function') return cap.getPlatform() === 'android';
  return /Android/i.test(String(navigator.userAgent || ''));
}

export function useAndroidApp() {
  return useSyncExternalStore(subscribe, isAndroidApp, () => false);
}

// true where plans and Pay buttons must stay hidden: inside the store app, except on Android where Google Play Billing sells them
export function isPlansHidden() {
  return isNativeApp() && !(ANDROID_PLAY_BILLING && isAndroidApp());
}

export function usePlansHidden() {
  return useSyncExternalStore(subscribe, isPlansHidden, () => false);
}
