import { redirect } from 'next/navigation';

// Customers used to be called Buyers. This keeps old bookmarks and links working.
export default async function BuyerPage({ params }) {
  const { id } = await params;
  redirect(`/dashboard/customers/${encodeURIComponent(id)}`);
}
