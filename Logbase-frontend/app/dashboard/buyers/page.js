import { redirect } from 'next/navigation';

// Customers used to be called Buyers. This keeps old bookmarks and links working.
export default function BuyersPage() {
  redirect('/dashboard/customers');
}
