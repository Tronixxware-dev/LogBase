import { redirect } from 'next/navigation';

// Customers used to be called Buyers. This keeps old bookmarks and links working.
export default function NewBuyerPage() {
  redirect('/dashboard/customers/new');
}
