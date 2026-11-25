'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerBusiness, setToken } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField } from '@/components/AuthShell';
import { Icon } from '@/components/Icons';
import { BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE } from '@/lib/businessTypes';
import { PLANS, PREVIEW_UNITS, naira } from '@/lib/site';
import { useNativeApp } from '@/lib/nativeApp';

const PLAN_KEYS = PLANS.map((p) => p.key);

// Step 1: the plan is picked before anything else. A paid plan lets the person try the app with a few products first and
// pay when they want to add more (the server enforces that); the Free plan needs no payment at all.
function PlanStep({ plan, interval, onPlan, onInterval, onNext }) {
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Billing period">
        {[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly · 2 months free' },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onInterval(o.value)}
            aria-pressed={interval === o.value}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${interval === o.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Plan" className="space-y-2">
        {PLANS.map((p) => {
          const selected = plan === p.key;
          const price = interval === 'yearly' ? p.yearly : p.monthly;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPlan(p.key)}
              className={`block w-full rounded-xl border p-4 text-left transition ${selected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className={`text-base font-semibold ${selected ? 'text-primary' : 'text-gray-900'}`}>
                  {p.name}
                  {p.popular && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Most popular</span>}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {p.key === 'free' ? 'Free' : `${naira(price)} / ${interval === 'yearly' ? 'year' : 'month'}`}
                </span>
              </span>
              <span className="mt-1 block text-xs text-gray-500">{p.tagline}</span>
              <span className="mt-2 block text-xs text-gray-600">{p.features.join(' · ')}</span>
              {p.key !== 'free' && (
                <span className="mt-2 block text-xs font-medium text-green-700">Try it first: add up to {PREVIEW_UNITS} products before you pay.</span>
              )}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onNext} className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark">
        Continue
      </button>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    businessType: DEFAULT_BUSINESS_TYPE,
    businessEmail: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    referralCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inApp = useNativeApp(); // the store apps do not create accounts (see below)
  const [step, setStep] = useState('plan'); // 'plan' first, then 'details'
  const [plan, setPlan] = useState('free');
  const [interval, setInterval] = useState('monthly');
  const picked = PLANS.find((p) => p.key === plan) || PLANS[0];

  // a link that carries a plan (…/signup?plan=starter&interval=yearly, from the pricing section) has it picked already
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const wanted = params.get('plan');
      if (wanted && PLAN_KEYS.includes(wanted)) setPlan(wanted);
      if (params.get('interval') === 'yearly') setInterval('yearly');
    } catch {
      // no address to read: Free stays picked
    }
  }, []);

  // a link that carries a code (…/signup?ref=ABC123) fills the code in
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) setForm((f) => (f.referralCode ? f : { ...f, referralCode: ref.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20) }));
    } catch {
      // no address to read: the field stays empty
    }
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await registerBusiness({ ...form, plan, interval });
      setToken(data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Like Netflix, the store apps do not create accounts: people sign up on the website, then log in here.
  if (inApp) {
    return (
      <AuthShell
        title="Create your account on the website"
        subtitle="New LogBase accounts are created at mylogbase.com. Once your account is ready, log in here."
        footer={
          <a href="/login" className="font-medium text-primary hover:underline">
            Back to log in
          </a>
        }
      >
        <a href="/login" className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark">
          Log in
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step === 'plan' ? 'Choose your plan' : 'Create your LogBase account'}
      subtitle={step === 'plan' ? 'Pick a plan to get started. You can change it later on the Billing page.' : "Set up your business — you'll be signed in as the administrator."}
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

      {step === 'plan' && <PlanStep plan={plan} interval={interval} onPlan={setPlan} onInterval={setInterval} onNext={() => setStep('details')} />}

      {step === 'details' && (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <span className="text-gray-700">
            <span className="font-medium">{picked.name} plan</span>
            {plan !== 'free' && ` · ${naira(interval === 'yearly' ? picked.yearly : picked.monthly)} / ${interval === 'yearly' ? 'year' : 'month'}, paid after you try it`}
          </span>
          <button type="button" onClick={() => setStep('plan')} className="font-medium text-primary hover:underline">
            Change
          </button>
        </div>

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

        <AuthField
          label="Referral code (optional)"
          icon="tag"
          name="referralCode"
          value={form.referralCode}
          onChange={(e) => setForm({ ...form, referralCode: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20) })}
          autoComplete="off"
          placeholder="If someone told you about LogBase"
        />

        <div className="pt-1">
          <AuthButton loading={loading} loadingText="Creating account…">
            Create account
          </AuthButton>
        </div>
      </form>
      )}
    </AuthShell>
  );
}
