// Buying a plan inside the Android app with Google Play Billing.
//
// The app is a thin wrapper around this website, and the wrapper carries a native billing plugin (NativePurchases). This file
// talks to it. The page never decides what a purchase is worth: after Google takes the payment the purchase token is sent to
// our server, which asks Google what it really is (see utils/googlePlay.js on the server) and only then gives the plan.

import { verifyGooglePurchase } from '@/lib/api';

function plugin() {
  if (typeof window === 'undefined') return null;
  const cap = window.Capacitor;
  return (cap && cap.Plugins && cap.Plugins.NativePurchases) || null;
}

// Is Google Play Billing usable on this phone (the plugin is in the app and Google Play is available)?
export async function googleBillingAvailable() {
  const p = plugin();
  if (!p) return false;
  try {
    const res = await p.isBillingSupported();
    return Boolean(res && res.isBillingSupported);
  } catch {
    return false;
  }
}

function friendly(err) {
  const text = String((err && (err.message || err.code)) || '').toLowerCase();
  if (text.includes('cancel') || text.includes('user_cancel') || text.includes('usercancel')) return { cancelled: true };
  if (text.includes('already') && text.includes('own')) return { message: 'You already have this plan on Google Play. Tap “Restore purchase” to bring it back.' };
  if (text.includes('unavailable') || text.includes('not found') || text.includes('item_unavailable')) {
    return { message: 'This plan is not available on Google Play right now. Please try again later.' };
  }
  return { message: (err && err.message) || 'The purchase did not go through. You were not charged.' };
}

// Buys a plan. productId is one of starter_monthly / starter_yearly / business_monthly / business_yearly,
// accountToken comes from our server (it ties the purchase to this business).
// Returns { subscription, google } from our server when the plan is active, { pending: true } when Google is still
// processing the payment, or { cancelled: true } when the person closed Google's sheet.
export async function buyPlan(productId, accountToken) {
  const p = plugin();
  if (!p) throw new Error('Google Play is not available in this app. Please update the app from the Play Store.');
  try {
    const { products } = await p.getProducts({ productIdentifiers: [productId], productType: 'subs' });
    const offer = (products || []).find((x) => x.planIdentifier === productId || x.productIdentifier === productId) || (products || [])[0];
    if (!offer) throw new Error('This plan is not available on Google Play right now. Please try again later.');
    const tx = await p.purchaseProduct({
      productIdentifier: productId,
      planIdentifier: offer.identifier,
      offerToken: offer.offerToken || undefined,
      productType: 'subs',
      appAccountToken: accountToken,
    });
    const token = tx && (tx.purchaseToken || tx.transactionId);
    if (!token) throw new Error('Google did not return the purchase. If you were charged, tap “Restore purchase”.');
    return await verifyGooglePurchase(token);
  } catch (err) {
    if (err && (err.status || err.offline)) throw err; // our server's own answer: show it as it is
    const f = friendly(err);
    if (f.cancelled) return { cancelled: true };
    throw new Error(f.message);
  }
}

// Finds a plan already bought with this Google account (for example after reinstalling) and gives it to this business.
export async function restorePlan(accountToken) {
  const p = plugin();
  if (!p) throw new Error('Google Play is not available in this app.');
  let list = [];
  try {
    const res = await p.getPurchases({ productType: 'subs', appAccountToken: accountToken });
    list = (res && res.purchases) || [];
  } catch (err) {
    throw new Error((err && err.message) || 'Could not check Google Play. Please try again.');
  }
  const mine = list.filter((t) => t && t.purchaseToken);
  if (!mine.length) return { none: true };
  let last = null;
  for (const t of mine) {
    try {
      last = await verifyGooglePurchase(t.purchaseToken);
      if (last && last.subscription) break;
    } catch {
      // an old or expired purchase: try the next one
    }
  }
  return last || { none: true };
}

// Opens Google Play's own page where a subscription is changed or cancelled.
export async function manageInGooglePlay() {
  const p = plugin();
  if (p && typeof p.manageSubscriptions === 'function') {
    try {
      await p.manageSubscriptions();
      return;
    } catch {
      // fall through to the plain address
    }
  }
  window.location.href = 'https://play.google.com/store/account/subscriptions';
}
