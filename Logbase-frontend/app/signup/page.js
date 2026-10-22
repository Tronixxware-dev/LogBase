'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerBusiness, setToken } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField } from '@/components/AuthShell';
import { Icon } from '@/components/Icons';
import { BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE } from '@/lib/businessTypes';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    businessType: DEFAULT_BUSINESS_TYPE,
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
        {/* the kind of business decides the menus and pages you get */}
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-gray-700">What kind of business do you run?</legend>
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
            {BUSINESS_TYPES.map((type) => {
              const selected = form.businessType === type.key;
              return (
                <button
                  key={type.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setForm({ ...form, businessType: type.key })}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                    selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon name={type.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-primary' : 'text-gray-400'}`} />
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${selected ? 'text-primary' : 'text-gray-900'}`}>{type.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-500">{type.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="Business name"
            icon="store"
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            required
            placeholder="e.g. Adeyemi & Sons"
          />
          <AuthField
            label="Business email"
            icon="mail"
            type="email"
            name="businessEmail"
            value={form.businessEmail}
            onChange={handleChange}
            required
            placeholder="business@example.com"
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
