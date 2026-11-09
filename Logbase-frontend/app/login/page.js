'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField } from '@/components/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false); // sent here right after deleting the account

  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem('logbase_account_deleted') === '1';
      sessionStorage.removeItem('logbase_account_deleted');
    } catch {
      /* no saved flag */
    }
    if (flagged || new URLSearchParams(window.location.search).get('deleted') === '1') setDeleted(true);
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      setToken(data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Log in to LogBase"
      subtitle="Welcome back — enter your details to continue."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <a href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </a>
        </>
      }
    >
      {deleted && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Your account has been deleted.
        </p>
      )}
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Email"
          icon="mail"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
          placeholder="admin@example.com"
        />

        <AuthField
          label="Password"
          icon="lock"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
          placeholder="Your password"
          right={
            <a href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </a>
          }
        />

        <AuthButton loading={loading} loadingText="Logging in…">
          Log in
        </AuthButton>
      </form>
    </AuthShell>
  );
}
