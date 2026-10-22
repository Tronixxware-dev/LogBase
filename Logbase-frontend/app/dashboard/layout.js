import { UserProvider } from '@/components/UserProvider';
import Navbar from '@/components/Navbar';
import TopBar from '@/components/TopBar';
import RoleGuard from '@/components/RoleGuard';
import TypeHome from '@/components/TypeHome';
import BillingBanner from '@/components/BillingBanner';
import OfflineStatus from '@/components/OfflineStatus';
import PageTransition from '@/components/PageTransition';
import SuccessPopup from '@/components/SuccessPopup';

// Wraps EVERY page under /dashboard: login check + left sidebar + top bar + page container.
// RoleGuard keeps staffs on the few pages they are allowed to use.
// TypeHome sends a laundromat or a repair workshop to its own main page instead of the sales Overview.
// Individual pages only render their own content.
export default function DashboardLayout({ children }) {
  return (
    <UserProvider>
      <div className="min-h-screen print:bg-white">
        <SuccessPopup />
        <Navbar />
        <div className="lg:pl-64 print:pl-0">
          <TopBar />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <OfflineStatus />
            <BillingBanner />
            <PageTransition>
              <RoleGuard>
                <TypeHome>{children}</TypeHome>
              </RoleGuard>
            </PageTransition>
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
