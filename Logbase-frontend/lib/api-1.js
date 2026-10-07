const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ------------------------------------------------------------------ */
/* Token storage                                                      */
/* ------------------------------------------------------------------ */

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('loggr_token');
}

function setToken(token) {
  localStorage.setItem('loggr_token', token);
}

function clearToken() {
  localStorage.removeItem('loggr_token');
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

async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && auth) handleUnauthorized();
    throw new Error(data.message || 'Something went wrong');
  }

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

export function getMe() {
  return apiRequest('/auth/me', { auth: true });
}

// Owner + staff of the business (used for the "Sold by" suggestions)
export function listTeam() {
  return apiRequest('/auth/team', { auth: true });
}

// Worker accounts (owner only)
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

// Roles the owner has made (a name plus ticked permissions, offered in the dropdown when adding a worker)
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

  const res = await fetch(`${API_URL}/products/${id}/images`, {
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
/* Buyers                                                             */
/* ------------------------------------------------------------------ */

export function listBuyers(query = '') {
  return apiRequest(`/buyers${query}`, { auth: true });
}

export function getBuyer(id) {
  return apiRequest(`/buyers/${id}`, { auth: true });
}

export function createBuyer(payload) {
  return apiRequest('/buyers', { method: 'POST', body: payload, auth: true });
}

export function updateBuyer(id, payload) {
  return apiRequest(`/buyers/${id}`, { method: 'PUT', body: payload, auth: true });
}

export function recordBuyerPayment(id, payload) {
  return apiRequest(`/buyers/${id}/payments`, { method: 'POST', body: payload, auth: true });
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
    return apiRequest('/sales', { method: 'POST', body: payload, auth: true });
  }

  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));
  Array.from(files).forEach((file) => formData.append('images', file));

  const res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new Error(data.message || 'Could not record the sale');
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

  const res = await fetch(`${API_URL}/purchases`, {
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
