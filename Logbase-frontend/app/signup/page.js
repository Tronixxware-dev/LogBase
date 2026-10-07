'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerBusiness, setToken } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField } from '@/components/AuthShell';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    businessEmail: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
  });
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
      const data = await registerBusiness(form);
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
      title="Create your LogBase account"
      subtitle="Set up your business — you'll be signed in as the administrator."
      footer={
        <>
          Already have an account?{' '}
          <a href="/login" className="font-medium text-primary hover:underline">
            Log in
          </a>
        </>
      }
    >
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="Business name"
            icon="store"
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            required
            placeholder="Tronixxware Gadgets"
          />
          <AuthField
            label="Business email"
            icon="mail"
            type="email"
            name="businessEmail"
            value={form.businessEmail}
            onChange={handleChange}
            required
            placeholder="shop@example.com"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="Your name"
            icon="user"
            name="ownerName"
            value={form.ownerName}
            onChange={handleChange}
            required
            placeholder="Samuel"
          />
          <AuthField
            label="Your email"
            icon="mail"
            type="email"
            name="ownerEmail"
            value={form.ownerEmail}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="admin@example.com"
          />
        </div>

        <AuthField
          label="Password"
          icon="lock"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="At least 6 characters"
        />

        <div className="pt-1">
          <AuthButton loading={loading} loadingText="Creating account…">
            Create account
          </AuthButton>
        </div>
      </form>
    </AuthShell>
  );
}
