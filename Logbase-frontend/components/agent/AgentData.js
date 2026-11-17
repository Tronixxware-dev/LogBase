'use client';

import { createContext, useContext } from 'react';
import { getMyAgent } from '@/lib/api';
import { useLoad } from '@/components/admin/ui';
import { ErrorBanner, LoadingState, secondaryButtonClass } from '@/components/ui';

const AgentContext = createContext(null);

// Loads the Sales Agent's numbers ONCE for all the agent pages, so moving between Home, Shops, Money and the rest is instant.
export function AgentDataProvider({ children }) {
  const { data, error, loading, reload } = useLoad(() => getMyAgent(), []);

  if (loading && !data) return <LoadingState />;
  if (!data) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={error || 'Could not load your page'} />
        <button type="button" onClick={() => reload()} className={secondaryButtonClass}>
          Try again
        </button>
      </div>
    );
  }
  if (!data.agent) {
    return <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">There is no Sales Agent record linked to your account.</p>;
  }
  return <AgentContext.Provider value={{ data, reload }}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used inside <AgentDataProvider>');
  return ctx;
}
