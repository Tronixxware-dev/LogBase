import { redirect } from 'next/navigation';

// Stock now lives on the Products page, and the old stock log is "Stock activities".
// This keeps old bookmarks and links working.
export default function StockPage() {
  redirect('/dashboard/products');
}
