import { UserProvider } from '@/components/UserProvider';
import AgentShell from '@/components/agent/AgentShell';
import SuccessPopup from '@/components/SuccessPopup';

export const metadata = { title: 'Sales Agent', robots: { index: false, follow: false } };

// Everything under /agent: the Sales Agent's own, small app. No business menu, no orders, no stock: just what an agent needs.
export default function AgentLayout({ children }) {
  return (
    <UserProvider>
      <SuccessPopup />
      <AgentShell>{children}</AgentShell>
    </UserProvider>
  );
}
