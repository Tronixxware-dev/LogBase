'use client';

import { useState } from 'react';
import { forgotPassword } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField, AuthNotice } from '@/components/AuthShell';

// Step 1 of a password reset: type your email and we send a link.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const clean = email.trim();
    if (!clean) return setError('Enter the email you log in with');
    setLoading(true);
    try {
      await forgotPassword(clean);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle={sent ? undefined : 'Enter your email and we will send you a link to choose a new one.'}
      footer={
        <a href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </a>
      }
    >
      {sent ? (
        <>
          <AuthNotice>
            If that email belongs to a LogBase account, we have sent a link to reset its password. It works for 60 minutes.
          </AuthNotice>
          <p className="text-sm text-gray-500">
            Nothing in your inbox? Check the spam folder, then wait a minute and{' '}
            <button type="button" onClick={() => setSent(false)} className="font-medium text-primary hover:underline">
              try again
            </button>
            .
          </p>
        </>
      ) : (
        <>
          <AuthError>{error}</AuthError>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AuthField
              label="Email"
              icon="mail"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@example.com"
            />
            <AuthButton loading={loading} loadingText="Sending…">
              Send reset link
            </AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
