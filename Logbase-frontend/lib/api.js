import { markReachable } from '@/lib/connection';
import { cacheClear, cacheGet, cachePut } from '@/lib/offline';
import { getActiveShopId, scopedKey, forgetShop } from '@/lib/shopStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SALE_TIMEOUT_MS = 20000;
const OFFLINE_MESSAGE = 'You are offline, or the server cannot be reached. Check your internet connection and try again.';

/* ------------------------------------------------------------------ */
/* Token storage                                                      */
/* ------------------------------------------------------------------ */

const TOKEN_KEY = 'logbase_token';
const RETURNING_KEY = 'logbase_returning'; // set once someone has signed in on this device (see components/site/ReturnVisitRedirect.js)
const OLD_TOKEN_KEYS = ['logg_token', 'loggr_token']; // the app's earlier names: people who are already signed in stay signed in

function getToken() {
  if (typeof window === 'undefined') return null;
  const current = localStorage.getItem(TOKEN_KEY);
  if (current) return current;
  for (const key of OLD_TOKEN_KEYS) {
    const old = localStorage.getItem(key);
    if (old) {
      localStorage.setItem(TOKEN_KEY, old);
      OLD_TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
      return old;
    }
  }
  return null;
}

// A new sign-in or a sign-out starts with a clean saved copy, so the next person never sees the last person's data.
// (Sales waiting in the outbox are NOT touched: they belong to whoever recorded them and are sent when they sign in again.)
function setToken(token) {
  cacheClear();
  forgetShop(); // the next person starts in the main store
  localStorage.setItem(TOKEN_KEY, token);
  OLD_TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
  // remember that LogBase has been used on this device: the home page then opens the app / sign-in page instead of the sales page
  try {
    if (!localStorage.getItem(RETURNING_KEY)) localStorage.setItem(RETURNING_KEY, new Date().toISOString());
  } catch {}
}

function clearToken() {
  cacheClear();
  forgetShop();
  localStorage.removeItem(TOKEN_KEY);
  OLD_TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
}

// If the backend says our token is no longer valid, drop it and go to login.
function handleUnauthorized() {
  clearToken();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/* ------------------------------------------------------------------ */
/* Core request helper                                                */
/* ------------------------------------------------------------------ */

// fetch(), but a request that cannot reach the server becomes an error with `offline: true`
// (so pages and the outbox can tell "no connection" from "the server said no"), and the connection state is kept up to date.
// timeoutMs: give up waiting after this long and treat it like "no connection" (a poor connection can hang for minutes).
// The server may still have received the request, which is why sales carry an id that makes a repeat harmless.
async function send(url, options, timeoutMs) {
  let res;
  let timer;
  try {
    if (timeoutMs) {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);
      res = await fetch(url, { ...options, signal: controller.signal });
    } else {
      res = await fetch(url, options);
    }
  } catch {
    markReachable(false);
    const err = new Error(OFFLINE_MESSAGE);
    err.offline = true;
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
  markReachable(true);
  return res;
}

// Is the server answering? (used to notice that the connection is back)
export async function pingServer() {
  try {
    const res = await send(`${API_URL}/health`, { method: 'GET', cache: 'no-store' }, 8000);
    return res.ok;
  } catch {
    return false;
  }
}

async function apiRequest(path, { method = 'GET', body, auth = false, timeoutMs } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    // the store this person is working in (empty = the main store)
    const shopId = getActiveShopId();
    if (shopId) headers['X-Shop-Id'] = shopId;
  }

  // Signed-in pages keep a copy of what the server last said, so they still open with no connection.
  const saveCopy = method === 'GET' && auth;

  let res;
  try {
    res = await send(
      `${API_URL}${path}`,
      {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
      timeoutMs
    );
  } catch (err) {
    if (saveCopy && err.offline) {
      const copy = await cacheGet(scopedKey(path));
      if (copy) return copy.data;
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && auth) handleUnauthorized();
    const err = new Error(data.message || 'Something went wrong');
    err.status = res.status; // lets a page tell "your plan does not allow this" (402) from other problems
    throw err;
  }

  if (saveCopy) cachePut(scopedKey(path), data);
  return data;
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

export function registerBusiness(payload) {
  return apiRequest('/auth/register', { method: 'POST', body: payload });
}

export function login(payload) {
  return apiRequest('/auth/login', { method: 'POST', body: payload });
}

// Forgot password: asks for a reset link by email. The answer is the same whether or not the email has an account.
export function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
}

// token comes from the emailed link
export function resetPassword(token, password) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } });
}

// Changing the login email: step 1 (from the profile) sends a link to the new address; step 2 is opening that link.
export function requestEmailChange(newEmail, password) {
  return apiRequest('/auth/me/email', { method: 'POST', body: { newEmail, password }, auth: true });
}

export function confirmEmailChange(token) {
  return apiRequest('/auth/confirm-email', { method: 'POST', body: { token } });
}

export function getMe() {
  return apiRequest('/auth/me', { auth: true });
}

// Change your own name / phone (the owner can also send businessName). Returns the updated user.
export function updateMe(payload) {
  return apiRequest('/auth/me', { method: 'PATCH', body: payload, auth: true });
}

// Sends one picture as multipart form data (apiRequest only sends JSON).
async function uploadPicture(path, field, file) {
  const formData = new FormData();
  formData.append(field, file);

  const res = await send(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new Error(data.message || 'Upload failed');
  }
  return data;
}

// Your own profile photo and cover picture. Each returns the updated user (with photoUrl / coverUrl).
// A staff can add each one once; after that only the administrator can change it (the server says so).
export function uploadMyPhoto(file) {
  return uploadPicture('/auth/me/photo', 'photo', file);
}

export function deleteMyPhoto() {
  return apiRequest('/auth/me/photo', { method: 'DELETE', auth: true });
}

export function uploadMyCover(file) {
  return uploadPicture('/auth/me/cover', 'cover', file);
}

export function deleteMyCover() {
  return apiRequest('/auth/me/cover', { method: 'DELETE', auth: true });
}

// A staff's photo and cover picture (administrator only)
export function uploadStaffPhoto(id, file) {
  return uploadPicture(`/auth/staff/${id}/photo`, 'photo', file);
}

export function deleteStaffPhoto(id) {
  return apiRequest(`/auth/staff/${id}/photo`, { method: 'DELETE', auth: true });
}

export function uploadStaffCover(id, file) {
  return uploadPicture(`/auth/staff/${id}/cover`, 'cover', file);
}

export function deleteStaffCover(id) {
  return apiRequest(`/auth/staff/${id}/cover`, { method: 'DELETE', auth: true });
}

export async function changePassword(payload) {
  const data = await apiRequest('/auth/change-password', { method: 'POST', body: payload, auth: true });
  // every older login stops working when the password changes; the answer carries a fresh one so this browser stays signed in
  if (data && data.token) setToken(data.token);
  return data;
}

// Find an item by its IMEI / serial number (or the last digits of it): where it came from, who bought it, the warranty.
export function lookupSerial(q) {
  return apiRequest(`/serials/lookup?q=${encodeURIComponent(q)}`, { auth: true });
}

// The numbers of a product's units that are on the shelf (the sale form offers them while typing)
export function availableSerials(productId, variantId) {
  const query = `product=${encodeURIComponent(productId)}${variantId ? `&variant=${encodeURIComponent(variantId)}` : ''}`;
  return apiRequest(`/serials/available?${query}`, { auth: true });
}

// Every IMEI / serial number recorded for a product (on the shelf, sold, written off), and how many of the pieces have one.
export function listProductSerials(productId) {
  return apiRequest(`/serials/product/${productId}`, { auth: true });
}

// Records numbers for pieces the shop already holds. body: { serials: 'text or list', variant? }
export function addProductSerials(productId, body) {
  return apiRequest(`/serials/product/${productId}`, { method: 'POST', body, auth: true });
}

// Corrects a number (or the colour / size it is under) of a unit that is not sold. body: { serial?, variant? }
export function updateSerialUnit(unitId, body) {
  return apiRequest(`/serials/${unitId}`, { method: 'PUT', body, auth: true });
}

// Takes a number off the record (the stock count does not change)
export function removeSerialUnit(unitId) {
  return apiRequest(`/serials/${unitId}`, { method: 'DELETE', auth: true });
}

// Owner + staff of the business (used for the "Sold by" suggestions)
export function listTeam() {
  return apiRequest('/auth/team', { auth: true });
}

// Staff accounts (owner only)
export function listStaff() {
  return apiRequest('/auth/staff', { auth: true });
}

export function inviteStaff(payload) {
  return apiRequest('/auth/invite-staff', { method: 'POST', body: payload, auth: true });
}

// payload can hold: name, password (reset), isActive (switch the account off / on)
export function updateStaff(id, payload) {
  return apiRequest(`/auth/staff/${id}`, { method: 'PATCH', body: payload, auth: true });
}

// Roles the owner has made (a name plus ticked permissions, offered in the dropdown when adding a staff)
export function listRoles() {
  return apiRequest('/roles', { auth: true });
}

export function createRole(payload) {
  return apiRequest('/roles', { method: 'POST', body: payload, auth: true });
}

// payload can hold: name, permissions
export function updateRole(id, payload) {
  return apiRequest(`/roles/${id}`, { method: 'PUT', body: payload, auth: true });
}

export function deleteRole(id) {
  return apiRequest(`/roles/${id}`, { method: 'DELETE', auth: true });
}

/* ------------------------------------------------------------------ */
/* Categories                                                         */
/* ------------------------------------------------------------------ */

export function listCategories() {
  return apiRequest('/categories', { auth: true });
}

export function createCategory(name) {
  return apiRequest('/categories', { method: 'POST', body: { name }, auth: true });
}

export function renameCategory(id, name) {
  return apiRequest(`/categories/${id}`, { method: 'PUT', body: { name }, auth: true });
}

export function deleteCategory(id) {
  return apiRequest(`/categories/${id}`, { method: 'DELETE', auth: true });
}

/* ------------------------------------------------------------------ */
/* Products                                                           */
/* ------------------------------------------------------------------ */

export function listProducts(query = '') {
  return apiRequest(`/products${query}`, { auth: true });
}

export function getProduct(id) {
  return apiRequest(`/products/${id}`, { auth: true });
}

export function createProduct(payload) {
  return apiRequest('/products', { method: 'POST', body: payload, auth: true });
}

export function updateProduct(id, payload) {
  return apiRequest(`/products/${id}`, { method: 'PUT', body: payload, auth: true });
}

export function deleteProduct(id) {
  return apiRequest(`/products/${id}`, { method: 'DELETE', auth: true });
}

// Colour / size variants of a product, each with its own stock
export function addVariant(productId, payload) {
  return apiRequest(`/products/${productId}/variants`, { method: 'POST', body: payload, auth: true });
}

export function updateVariant(productId, variantId, payload) {
  return apiRequest(`/products/${productId}/variants/${variantId}`, {
    method: 'PUT',
    body: payload,
    auth: true,
  });
}

export function deleteVariant(productId, variantId) {
  return apiRequest(`/products/${productId}/variants/${variantId}`, { method: 'DELETE', auth: true });
}

export async function uploadProductImages(id, files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('images', file));

  const res = await send(`${API_URL}/products/${id}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new Error(data.message || 'Upload failed');
  }
  return data;
}

export function deleteProductImage(id, publicId) {
  return apiRequest(`/products/${id}/images/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
    auth: true,
  });
}

/* ------------------------------------------------------------------ */
/* Customers                                                             */
/* ------------------------------------------------------------------ */

export function listCustomers(query = '') {
  return apiRequest(`/customers${query}`, { auth: true });
}

export function getCustomer(id) {
  return apiRequest(`/customers/${id}`, { auth: true });
}

export function createCustomer(payload) {
  return apiRequest('/customers', { method: 'POST', body: payload, auth: true });
}

export function updateCustomer(id, payload) {
  return apiRequest(`/customers/${id}`, { method: 'PUT', body: payload, auth: true });
}

export function recordCustomerPayment(id, payload) {
  return apiRequest(`/customers/${id}/payments`, { method: 'POST', body: payload, auth: true });
}

// The customer's account as a list (sales, payments, returns) with a running balance.
export function getCustomerStatement(id) {
  return apiRequest(`/customers/${id}/statement`, { auth: true });
}

/* ------------------------------------------------------------------ */
/* Returns, stock adjustments and the activity log                      */
/* ------------------------------------------------------------------ */

// payload: { items: [{ sale, quantity }], restock, refundMethod, reason, note }
export function createReturn(payload) {
  return apiRequest('/returns', { method: 'POST', body: payload, auth: true });
}

export function listReturns(query = '') {
  return apiRequest(`/returns${query}`, { auth: true });
}

// payload: { product, variant?, type, quantity, direction?, note }
export function createStockAdjustment(payload) {
  return apiRequest('/stock-adjustments', { method: 'POST', body: payload, auth: true });
}

export function listStockAdjustments(query = '') {
  return apiRequest(`/stock-adjustments${query}`, { auth: true });
}

// Administrator only. query: ?category=sale&search=ada&before=<date>
export function listActivity(query = '') {
  return apiRequest(`/activity${query}`, { auth: true });
}

/* ------------------------------------------------------------------ */
/* Billing (administrator only)                                       */
/* ------------------------------------------------------------------ */

// Current plan, what is being used, the plans on offer and recent payments.
export function getBilling() {
  return apiRequest('/billing', { auth: true });
}

// plan: 'starter' | 'business', interval: 'monthly' | 'yearly'. Returns { authorizationUrl, reference }:
// send the browser to authorizationUrl to pay on Paystack. The price is worked out on the server.
// autoRenew: true when the person ticked "Renew automatically" (the card they pay with is then kept for renewals).
export function startCheckout(plan, interval, autoRenew = false) {
  return apiRequest('/billing/checkout', { method: 'POST', body: { plan, interval, autoRenew: autoRenew === true }, auth: true });
}

// Turns automatic renewal on or off. Returns { autoRenew, subscription }.
export function setAutoRenew(enabled) {
  return apiRequest('/billing/auto-renew', { method: 'PUT', body: { enabled: Boolean(enabled) }, auth: true });
}

// Forgets the saved card (and so switches automatic renewal off). Returns { autoRenew }.
export function removeSavedCard() {
  return apiRequest('/billing/card', { method: 'DELETE', auth: true });
}

// Asks the server to check a payment with Paystack (used when the person comes back from paying).
export function verifyPayment(reference) {
  return apiRequest('/billing/verify', { method: 'POST', body: { reference }, auth: true });
}

/* ------------------------------------------------------------------ */
/* Expenses (administrator only)                                      */
/* ------------------------------------------------------------------ */

// query: ?from=2026-10-01&to=2026-10-31. Returns { expenses, total, byCategory, truncated }.
export function listExpenses(query = '') {
  return apiRequest(`/expenses${query}`, { auth: true });
}

// payload: { category, amount, description, date?, paymentMethod? }
export function createExpense(payload) {
  return apiRequest('/expenses', { method: 'POST', body: payload, auth: true });
}

export function deleteExpense(id) {
  return apiRequest(`/expenses/${id}`, { method: 'DELETE', auth: true });
}

/* ------------------------------------------------------------------ */
/* Import (administrator only)                                        */
/* ------------------------------------------------------------------ */

// rows: [{ line, name, sellingPrice, ... }], at most 200 at a time. Returns { created, skipped: [{ line, name, reason }], total }.
export function importProducts(rows) {
  return apiRequest('/import/products', { method: 'POST', body: { rows }, auth: true });
}

export function importCustomers(rows) {
  return apiRequest('/import/customers', { method: 'POST', body: { rows }, auth: true });
}

/* ------------------------------------------------------------------ */
/* Sales                                                              */
/* ------------------------------------------------------------------ */

export function listSales(query = '') {
  return apiRequest(`/sales${query}`, { auth: true });
}

export function getSale(id) {
  return apiRequest(`/sales/${id}`, { auth: true });
}

// Records a sale. Photos (if any) are sent together with the sale and saved with it.
// Once recorded, a sale and its photos cannot be changed.
export async function createSale(payload, files = []) {
  if (!files || files.length === 0) {
    return apiRequest('/sales', { method: 'POST', body: payload, auth: true, timeoutMs: SALE_TIMEOUT_MS });
  }

  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));
  Array.from(files).forEach((file) => formData.append('images', file));

  const res = await send(
    `${API_URL}/sales`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, ...(getActiveShopId() ? { 'X-Shop-Id': getActiveShopId() } : {}) },
      body: formData,
    },
    SALE_TIMEOUT_MS * 2 // photos take longer
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const err = new Error(data.message || 'Could not record the sale');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* Suppliers                                                          */
/* ------------------------------------------------------------------ */

export function listSuppliers(query = '') {
  return apiRequest(`/suppliers${query}`, { auth: true });
}

export function getSupplier(id) {
  return apiRequest(`/suppliers/${id}`, { auth: true });
}

export function createSupplier(payload) {
  return apiRequest('/suppliers', { method: 'POST', body: payload, auth: true });
}

export function updateSupplier(id, payload) {
  return apiRequest(`/suppliers/${id}`, { method: 'PUT', body: payload, auth: true });
}

// Pays off some of what the business owes a supplier (administrator only).
export function recordSupplierPayment(id, payload) {
  return apiRequest(`/suppliers/${id}/payments`, { method: 'POST', body: payload, auth: true });
}

// Adds the supplier to a purchase a staff recorded without one (administrator only).
export function assignPurchaseSupplier(id, payload) {
  return apiRequest(`/purchases/${id}/supplier`, { method: 'PUT', body: payload, auth: true });
}

export function getSupplierStatement(id) {
  return apiRequest(`/suppliers/${id}/statement`, { auth: true });
}

/* ------------------------------------------------------------------ */
/* Purchases                                                          */
/* ------------------------------------------------------------------ */

export function listPurchases(query = '') {
  return apiRequest(`/purchases${query}`, { auth: true });
}

export function getPurchase(id) {
  return apiRequest(`/purchases/${id}`, { auth: true });
}

// Records a purchase. Photos (if any) are sent together with the purchase and saved with it.
// Once recorded, a purchase and its photos cannot be changed.
export async function createPurchase(payload, files = []) {
  if (!files || files.length === 0) {
    return apiRequest('/purchases', { method: 'POST', body: payload, auth: true });
  }

  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));
  Array.from(files).forEach((file) => formData.append('images', file));

  const res = await send(`${API_URL}/purchases`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, ...(getActiveShopId() ? { 'X-Shop-Id': getActiveShopId() } : {}) },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new Error(data.message || 'Could not record the purchase');
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* Admin panel (the LogBase super admin only; the server checks it)    */
/* ------------------------------------------------------------------ */

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function adminOverview() {
  return apiRequest('/admin/overview', { auth: true });
}

// params: { search, state, sort, page }
export function adminBusinesses(params) {
  return apiRequest(`/admin/businesses${query(params)}`, { auth: true });
}

export function adminBusiness(id) {
  return apiRequest(`/admin/businesses/${id}`, { auth: true });
}

// kind: sales | products | customers | expenses | purchases   (read-only)
export function adminBusinessData(id, kind, page = 1) {
  return apiRequest(`/admin/businesses/${id}/data/${kind}${query({ page })}`, { auth: true });
}

export function adminSetSuspended(id, suspended, reason = '') {
  return apiRequest(`/admin/businesses/${id}/suspend`, { method: 'POST', body: { suspended, reason }, auth: true });
}

export function adminExtendTrial(id, days) {
  return apiRequest(`/admin/businesses/${id}/extend-trial`, { method: 'POST', body: { days }, auth: true });
}

export function adminGrantPlan(id, payload) {
  return apiRequest(`/admin/businesses/${id}/grant-plan`, { method: 'POST', body: payload, auth: true });
}

export function adminEndPlan(id) {
  return apiRequest(`/admin/businesses/${id}/end-plan`, { method: 'POST', body: {}, auth: true });
}

export function adminSendReset(userId) {
  return apiRequest(`/admin/users/${userId}/send-reset`, { method: 'POST', body: {}, auth: true });
}

// Changes the email a person logs in with, straight away (for someone who lost access to the old mailbox)
export function adminChangeUserEmail(userId, email) {
  return apiRequest(`/admin/users/${userId}/email`, { method: 'POST', body: { email }, auth: true });
}

export function adminSetUserActive(userId, isActive) {
  return apiRequest(`/admin/users/${userId}`, { method: 'PATCH', body: { isActive }, auth: true });
}

// params: { status, search, page }
// Referral codes: who may refer, who they referred and what they earned (the LogBase super admin only)
export function adminReferrers(params) {
  return apiRequest(`/admin/referrers${query(params)}`, { auth: true });
}

// What a referrer sees in their own account: { referrer: null } for everyone else
export function getMyReferrals() {
  return apiRequest('/referral/me', { auth: true });
}

// People who already have a LogBase account (to pick a referrer from). params: { search }
export function adminReferralPeople(params) {
  return apiRequest(`/admin/referrers/people${query(params)}`, { auth: true });
}

// payload: { name, phone?, email?, code? (empty = one is made), ratePercent?, notes?, userId? (the LogBase account they sign in with) }
export function adminCreateReferrer(payload) {
  return apiRequest('/admin/referrers', { method: 'POST', body: payload, auth: true });
}

export function adminReferrer(id) {
  return apiRequest(`/admin/referrers/${id}`, { auth: true });
}

// payload: any of { name, phone, email, ratePercent, isActive, notes, userId (null = unlink the LogBase account) }
export function adminUpdateReferrer(id, payload) {
  return apiRequest(`/admin/referrers/${id}`, { method: 'PATCH', body: payload, auth: true });
}

// Records that everything the referrer is owed has been paid to them
export function adminPayReferrer(id, note = '') {
  return apiRequest(`/admin/referrers/${id}/payout`, { method: 'POST', body: { note }, auth: true });
}

export function adminPayments(params) {
  return apiRequest(`/admin/payments${query(params)}`, { auth: true });
}

// params: { search, business, before }
export function adminActivity(params) {
  return apiRequest(`/admin/activity${query(params)}`, { auth: true });
}

export function adminLog(params) {
  return apiRequest(`/admin/log${query(params)}`, { auth: true });
}

export function adminEmailAudiences() {
  return apiRequest('/admin/email/audiences', { auth: true });
}

// payload: { audience, businessId, subject, message, dryRun }
export function adminSendEmail(payload) {
  return apiRequest('/admin/email', { method: 'POST', body: payload, auth: true, timeoutMs: 60000 });
}

/* ------------------------------------------------------------------ */
/* Item swaps (a swap itself is recorded with createSale + a tradeIn)  */
/* ------------------------------------------------------------------ */

export function listSwaps(query = '') {
  return apiRequest(`/swaps${query}`, { auth: true });
}

/* ------------------------------------------------------------------ */
/* Repair jobs                                                         */
/* ------------------------------------------------------------------ */

// params: { status, search }
export function listRepairs(params) {
  return apiRequest(`/repairs${query(params)}`, { auth: true });
}

export function getRepair(id) {
  return apiRequest(`/repairs/${id}`, { auth: true });
}

// The job carries its own id (clientId), so pressing Save twice, or a lost answer, never makes two jobs.
export function createRepair(payload) {
  return apiRequest('/repairs', { method: 'POST', body: payload, auth: true, timeoutMs: SALE_TIMEOUT_MS });
}

export function updateRepair(id, payload) {
  return apiRequest(`/repairs/${id}`, { method: 'PATCH', body: payload, auth: true });
}

// extra: { free: true } confirms that a job with no price is handed over free of charge
export function setRepairStatus(id, status, note, extra) {
  return apiRequest(`/repairs/${id}/status`, { method: 'POST', body: { status, note, ...(extra || {}) }, auth: true });
}

export function addRepairPayment(id, payload) {
  return apiRequest(`/repairs/${id}/payments`, { method: 'POST', body: payload, auth: true });
}

// payload: { product, variant?, quantity } for a spare part from stock, or { name, quantity, cost? } for one that is not
export function addRepairPart(id, payload) {
  return apiRequest(`/repairs/${id}/parts`, { method: 'POST', body: payload, auth: true });
}

export function removeRepairPart(id, partId) {
  return apiRequest(`/repairs/${id}/parts/${partId}`, { method: 'DELETE', auth: true });
}

export function deleteRepair(id) {
  return apiRequest(`/repairs/${id}`, { method: 'DELETE', auth: true });
}

/* ------------------------------------------------------------------ */
/* Laundry register                                                    */
/* ------------------------------------------------------------------ */

// the list of clothing types and their prices
export function listLaundryItems() {
  return apiRequest('/laundry/items', { auth: true });
}

export function createLaundryItem(payload) {
  return apiRequest('/laundry/items', { method: 'POST', body: payload, auth: true });
}

export function updateLaundryItem(id, payload) {
  return apiRequest(`/laundry/items/${id}`, { method: 'PUT', body: payload, auth: true });
}

export function deleteLaundryItem(id) {
  return apiRequest(`/laundry/items/${id}`, { method: 'DELETE', auth: true });
}

// params: { status, search }
export function listLaundryOrders(params) {
  return apiRequest(`/laundry${query(params)}`, { auth: true });
}

export function getLaundryOrder(id) {
  return apiRequest(`/laundry/${id}`, { auth: true });
}

export function createLaundryOrder(payload) {
  return apiRequest('/laundry', { method: 'POST', body: payload, auth: true, timeoutMs: SALE_TIMEOUT_MS });
}

export function updateLaundryOrder(id, payload) {
  return apiRequest(`/laundry/${id}`, { method: 'PATCH', body: payload, auth: true });
}

// `extra` can carry the delivery details to save with the new status: { handover, deliveryAddress, deliveryFee, riderName, riderPhone }
export function setLaundryStatus(id, status, note, extra) {
  return apiRequest(`/laundry/${id}/status`, { method: 'POST', body: { ...(extra || {}), status, note }, auth: true });
}

// Today at a glance, the last 30 days and the orders that need attention
export function getLaundryOverview() {
  return apiRequest('/laundry/overview', { auth: true });
}

export function addLaundryPayment(id, payload) {
  return apiRequest(`/laundry/${id}/payments`, { method: 'POST', body: payload, auth: true });
}

export function deleteLaundryOrder(id) {
  return apiRequest(`/laundry/${id}`, { method: 'DELETE', auth: true });
}

/* ------------------------------------------------------------------ */
/* Stores and stock transfers                                         */
/* ------------------------------------------------------------------ */

export function listShops() {
  return apiRequest('/shops', { auth: true });
}

export function createShop(payload) {
  return apiRequest('/shops', { method: 'POST', body: payload, auth: true });
}

export function updateShop(id, payload) {
  return apiRequest(`/shops/${id}`, { method: 'PATCH', body: payload, auth: true });
}

export function listTransfers(params = '') {
  return apiRequest(`/transfers${params}`, { auth: true });
}

export function getTransfer(id) {
  return apiRequest(`/transfers/${id}`, { auth: true });
}

export function createTransfer(payload) {
  return apiRequest('/transfers', { method: 'POST', body: payload, auth: true });
}

export function acceptTransfer(id) {
  return apiRequest(`/transfers/${id}/accept`, { method: 'POST', body: {}, auth: true });
}

export function declineTransfer(id, reason) {
  return apiRequest(`/transfers/${id}/decline`, { method: 'POST', body: { reason }, auth: true });
}

export function cancelTransfer(id, reason) {
  return apiRequest(`/transfers/${id}/cancel`, { method: 'POST', body: { reason }, auth: true });
}

export function restoreProduct(id) {
  return apiRequest(`/products/${id}/restore`, { method: 'POST', body: {}, auth: true });
}

export function setLowStockThreshold(threshold) {
  return apiRequest('/products/low-stock-threshold', { method: 'PUT', body: { threshold }, auth: true });
}

/* ------------------------------------------------------------------ */
/* Settings, approvals and alerts                                      */
/* ------------------------------------------------------------------ */

// The business identity, preferences and approval rules. Everyone reads them; only the administrator saves.
export function getSettings() {
  return apiRequest('/settings', { auth: true });
}

export function saveOrganization(payload) {
  return apiRequest('/settings/organization', { method: 'PUT', body: payload, auth: true });
}

export function savePreferences(payload) {
  return apiRequest('/settings/preferences', { method: 'PUT', body: payload, auth: true });
}

export function saveApprovalPolicies(payload) {
  return apiRequest('/settings/approval-policies', { method: 'PUT', body: payload, auth: true });
}

export function uploadLogo(file) {
  return uploadPicture('/settings/logo', 'logo', file);
}

export function deleteLogo() {
  return apiRequest('/settings/logo', { method: 'DELETE', auth: true });
}

// params: { status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'failed' }
export function listApprovals(params) {
  return apiRequest(`/approvals${query(params)}`, { auth: true });
}

export function approveRequest(id) {
  return apiRequest(`/approvals/${id}/approve`, { method: 'POST', body: {}, auth: true, timeoutMs: 70000 });
}

export function declineRequest(id, note) {
  return apiRequest(`/approvals/${id}/decline`, { method: 'POST', body: { note }, auth: true });
}

export function cancelRequest(id) {
  return apiRequest(`/approvals/${id}/cancel`, { method: 'POST', body: {}, auth: true });
}

// params: { unread: true, limit }
export function listNotifications(params) {
  return apiRequest(`/notifications${query(params)}`, { auth: true });
}

export function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, { method: 'POST', body: {}, auth: true });
}

export function markAllNotificationsRead() {
  return apiRequest('/notifications/read-all', { method: 'POST', body: {}, auth: true });
}

export function getNotificationPrefs() {
  return apiRequest('/notifications/preferences', { auth: true });
}

export function saveNotificationPrefs(payload) {
  return apiRequest('/notifications/preferences', { method: 'PUT', body: payload, auth: true });
}

export { getToken, setToken, clearToken };
