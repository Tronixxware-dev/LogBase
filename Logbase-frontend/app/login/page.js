'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField } from '@/components/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
