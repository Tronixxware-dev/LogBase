import { UserProvider } from '@/components/UserProvider';
import AdminShell from '@/components/admin/AdminShell';
import SuccessPopup from '@/components/SuccessPopup';

// Wraps EVERY page under /admin: the login check (UserProvider), then the super-admin check and the menu (AdminShell).
export const metadata = { title: 'Admin panel', robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return (
    <UserProvider>
      <SuccessPopup />
      <AdminShell>{children}</AdminShell>
    </UserProvider>
  );
}
