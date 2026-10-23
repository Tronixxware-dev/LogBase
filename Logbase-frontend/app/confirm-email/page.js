'use client';

import { useEffect, useState } from 'react';
import { confirmEmailChange } from '@/lib/api';
import AuthShell, { AuthError, AuthNotice } from '@/components/AuthShell';

// The page the link in the "Confirm your new email" message opens (…/confirm-email?token=…).
// The email changes when the button is pressed, not by just opening the page, so a mail scanner that opens links does nothing.
export default function ConfirmEmailPage() {
  const [token, setToken] = useState(null); // null until we have looked at the address
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);

  // Take the token out of the address bar so it is not left in the history or shared by accident.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
    if (params.has('token')) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function confirm() {
    setError('');
    setLoading(true);
    try {
      const result = await confirmEmailChange(token);
      setDone(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Confirm your new email" subtitle={token && !done ? 'Press the button to use this address as your LogBase login.' : undefined}>
      {token === null ? null : done ? (
        <>
          <AuthNotice>{done}</AuthNotice>
          <a href="/login" className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition hover:bg-primary-dark">
            Go to log in
          </a>
        </>
      ) : !token ? (
        <AuthNotice tone="amber">This link is not complete. Open the link from your email again, or ask for a new one from your profile.</AuthNotice>
      ) : (
        <>
          <AuthError>{error}</AuthError>
          <button
            type="button"
            onClick={confirm}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? 'Confirming…' : 'Confirm this email'}
          </button>
        </>
      )}
    </AuthShell>
  );
}
