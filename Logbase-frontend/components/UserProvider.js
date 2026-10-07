'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, getToken, clearToken } from '@/lib/api';
import { queueCounts } from '@/lib/outbox';
import { userCan } from '@/lib/permissions';

const UserContext = createContext(null);

// Wraps the whole dashboard. It is the ONE place that checks you are logged in:
// no token (or an invalid one) sends you to /login, otherwise it loads the
// current user and shares it with every page through useUser().
//
// With no connection the user comes from the copy this phone kept the last time it was online, so the app still opens.
// Only a refusal from the server (your sign-in is no longer valid) signs you out. A missing connection or a server
// problem never does: it shows a "try again" screen instead, so a shop with bad internet is not thrown out of the app.
export function UserProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [problem, setProblem] = useState(''); // why the user could not be loaded (not a sign-out)
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    let cancelled = false;
    setProblem('');
    getMe()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((err) => {
        if (cancelled) return;
        // 401 is already handled (signed out, sent to login); 403 / 404 mean this account is gone or blocked
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          clearToken();
          router.replace('/login');
          return;
        }
        setProblem(
          err.offline
            ? 'You are offline, and this phone has not opened LogBase online yet. Connect to the internet once, then try again.'
            : 'LogBase could not load your account just now. Check your connection and try again.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  // Signing out keeps sales that are still waiting to be sent on this phone; tell the person before they leave them.
  const logout = useCallback(async () => {
    try {
      const counts = await queueCounts(user);
      const waiting = counts.pending + counts.failed;
      if (waiting > 0) {
        const ok = window.confirm(
          `${waiting} sale${waiting === 1 ? ' has' : 's have'} not reached the server yet. ` +
            'They stay saved on this phone and are sent the next time you sign in with the internet on. Sign out anyway?'
        );
        if (!ok) return;
      }
    } catch {
      // the saved-sales store could not be read: do not block signing out
    }
    clearToken();
    router.replace('/login');
  }, [router, user]);

  // lets the Profile page put the saved name straight into the menu without reloading
  const updateUser = (changes) => setUser((current) => ({ ...current, ...changes }));

  if (!user) {
    if (problem) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-sm text-gray-600">{problem}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>
    );
  }

  // can('recordSales', ...) is true when the person has at least one of those permissions (the owner has all).
  // It decides which menu items, pages and buttons are shown. The server enforces the same rules,
  // so hiding something here is only about not showing buttons a staff cannot use.
  const can = (...wanted) => userCan(user, ...wanted);

  return (
    <UserContext.Provider value={{ user, updateUser, logout, isOwner: user.role === 'owner', can }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
