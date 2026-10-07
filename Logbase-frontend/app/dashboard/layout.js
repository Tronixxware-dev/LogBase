import { UserProvider } from '@/components/UserProvider';
import Navbar from '@/components/Navbar';
import TopBar from '@/components/TopBar';
import RoleGuard from '@/components/RoleGuard';
import BillingBanner from '@/components/BillingBanner';
import OfflineStatus from '@/components/OfflineStatus';
import PageTransition from '@/components/PageTransition';

// Wraps EVERY page under /dashboard: login check + left sidebar + top bar + page container.
// RoleGuard keeps staffs on the few pages they are allowed to use.
// Individual pages only render their own content.
export default function DashboardLayout({ children }) {
  return (
    <UserProvider>
      <div className="min-h-screen print:bg-white">
        <Navbar />
        <div className="lg:pl-64 print:pl-0">
          <TopBar />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <OfflineStatus />
            <BillingBanner />
            <PageTransition>
              <RoleGuard>{children}</RoleGuard>
            </PageTransition>
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
