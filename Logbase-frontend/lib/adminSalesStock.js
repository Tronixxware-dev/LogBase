import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// The numbers for the admin panel's Sales & Stock page (days: 7, 30 or 90). Only the LogBase super admin gets an answer.
export async function adminSalesStock(days = 30) {
  let res;
  try {
    res = await fetch(`${API_URL}/admin/sales-stock?days=${days}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      cache: 'no-store',
    });
  } catch {
    throw new Error('The server cannot be reached. Check your internet connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load Sales & Stock');
  return data;
}
