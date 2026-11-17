'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { LogoLoader } from '@/components/LogoLoader';

// A Sales Agent who has no business of their own never sees the business pages (/dashboard): they go to /agent.
// (The server refuses those requests as well; this only stops the pages from showing errors.)
export default function AgentOnlyGuard({ children }) {
  const router = useRouter();
  const { user } = useUser();
  const agentOnly = user.role === 'agent';

  useEffect(() => {
    if (agentOnly) router.replace('/agent');
  }, [agentOnly, router]);

  if (agentOnly) return <LogoLoader fullscreen label="Opening LogBase…" />;
  return children;
}
