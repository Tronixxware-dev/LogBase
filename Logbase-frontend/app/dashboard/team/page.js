import { redirect } from 'next/navigation';

// The Staffs page used to live at /dashboard/team. This keeps old bookmarks and links working.
export default function TeamPage() {
  redirect('/dashboard/staffs');
}
