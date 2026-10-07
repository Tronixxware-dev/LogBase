'use client';

import { useEffect, useState } from 'react';
import { resetPassword } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField, AuthNotice } from '@/components/AuthShell';

const MIN_LENGTH = 6;

// Step 2 of a password reset: the emailed link opens this page with ?token=...
export default function ResetPasswordPage() {
  const [token, setToken] = useState(null); // null until we have looked at the address
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Take the token out of the address bar so it is not left in the history or shared by accident.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
    if (params.has('token')) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) return setError(`The new password must be at least ${MIN_LENGTH} characters`);
    if (password !== confirm) return setError('The two passwords are not the same');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={token && !done ? 'Enter the new password for your account.' : undefined}
    >
      {token === null ? null : done ? (
        <>
          <AuthNotice>Your password was changed. You can log in now.</AuthNotice>
          <a
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Go to log in
          </a>
        </>
      ) : !token ? (
        <>
          <AuthNotice tone="amber">
            This reset link is not complete. Open the link from your email again, or ask for a new one.
          </AuthNotice>
          <a href="/forgot-password" className="block text-center font-medium text-primary hover:underline">
            Ask for a new link
          </a>
        </>
      ) : (
        <>
          <AuthError>
            {error}
            {error && /expired|already used|not valid/.test(error) && (
              <>
                {' '}
                <a href="/forgot-password" className="font-medium underline">
                  Ask for a new link
                </a>
              </>
            )}
          </AuthError>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AuthField
              label="New password"
              icon="lock"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={`At least ${MIN_LENGTH} characters`}
            />
            <AuthField
              label="Type it again"
              icon="lock"
              type="password"
              name="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <AuthButton loading={loading} loadingText="Saving…">
              Change password
            </AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
