'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ALL_PLANS_INCLUDE, PLANS, SITE, naira } from '@/lib/site';
import { Icon } from '@/components/Icons';

// The three plans with a monthly / yearly switch. The yearly price is two months free.
export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Simple prices, in naira</h2>
          <p className="mt-4 text-gray-500">
            Every new business gets a free {SITE.trialDays}-day trial of the Business plan. No card needed to start.
          </p>

          <div className="mt-8 inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Billing period">
            {[
              { value: false, label: 'Monthly' },
              { value: true, label: 'Yearly · 2 months free' },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setYearly(o.value)}
                aria-pressed={yearly === o.value}
                className={`rounded-lg px-4 py-2 text-sm transition-all duration-200 ${
                  yearly === o.value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-9 grid gap-6 sm:mt-12 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm sm:p-7 ${
                  plan.popular ? 'border-primary shadow-lg ring-1 ring-primary/30' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <span className="brand-gradient absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="tabular text-4xl font-semibold tracking-tight text-gray-900">{naira(price)}</span>
                  <span className="text-sm text-gray-500">{plan.key === 'free' ? 'forever' : yearly ? '/ year' : '/ month'}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-gray-700">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={
                    plan.popular
                      ? 'mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark'
                      : 'mt-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-xs transition hover:bg-gray-50'
                  }
                >
                  {plan.key === 'free' ? 'Start free' : `Try ${plan.name} free for ${SITE.trialDays} days`}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-xs">
          <p className="text-sm font-semibold text-gray-900">Every plan includes</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            {ALL_PLANS_INCLUDE.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-primary" strokeWidth={2.4} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Prices are in Nigerian naira. Payments are processed by Paystack. See our{' '}
          <Link href="/refund-policy" className="underline underline-offset-2 hover:text-gray-600">Refund Policy</Link>.
        </p>
      </div>
    </section>
  );
}
