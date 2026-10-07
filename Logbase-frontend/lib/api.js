import { markReachable } from '@/lib/connection';
import { cacheClear, cacheGet, cachePut } from '@/lib/offline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SALE_TIMEOUT_MS = 20000;
const OFFLINE_MESSAGE = 'You are offline, or the server cannot be reached. Check your internet connection and try again.';

/* ------------------------------------------------------------------ */
/* Token storage                                                      */
/* ------------------------------------------------------------------ */

const TOKEN_KEY = 'logbase_token';
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
  localStorage.setItem(TOKEN_KEY, token);
  OLD_TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
}

function clearToken() {
  cacheClear();
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
      const copy = await cacheGet(path);
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

  if (saveCopy) cachePut(path, data);
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
      headers: { Authorization: `Bearer ${getToken()}` },
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
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new Error(data.message || 'Could not record the purchase');
  }
  return data;
}

export { getToken, setToken, clearToken };
