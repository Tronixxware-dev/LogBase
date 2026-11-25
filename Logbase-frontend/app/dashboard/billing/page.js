'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBilling, removeSavedCard, setAutoRenew, startCheckout, verifyPayment } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import {
  PAYMENT_STATUS,
  autoRenewNotice,
  autoRenewResultMessage,
  cardText,
  limitText,
  outcomeMessage,
  planLines,
  priceText,
  statusOf,
  usagePercent,
  yearlySaving,
} from '@/lib/billing';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/components/UserProvider';
import { useAndroidApp, usePlansHidden } from '@/lib/nativeApp';
import { buyPlan, googleBillingAvailable, manageInGooglePlay, restorePlan } from '@/lib/googleBilling';
import { businessTypeOf, isOrderBased } from '@/lib/businessTypes';
import { ErrorBanner, LoadingState, cardClass, primaryButtonClass } from '@/components/ui';

const PLAN_ORDER = ['free', 'starter', 'business'];

const TONE = {
  good: 'border-green-200 bg-green-50 text-green-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  bad: 'border-red-200 bg-red-50 text-red-700',
};

function Notice({ tone, children }) {
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${TONE[tone] || TONE.warn}`}>{children}</div>;
}

function Meter({ label, used, limit }) {
  const percent = usagePercent(used, limit);
  const over = limit != null && used >= limit;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {Number(used).toLocaleString()} <span className="font-normal text-gray-400">of {limitText(limit)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100" role="presentation">
        {limit != null && (
          <div className={`h-full rounded-full ${over ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${percent}%` }} />
        )}
      </div>
    </div>
  );
}

// Your plan, what you use, the plans on offer and your payments. Administrator only.
// On the website plans are paid on Paystack; inside the Android app they are bought with Google Play Billing.
function BillingScreen() {
  const { user } = useUser();
  const android = useAndroidApp();
  const [googleReady, setGoogleReady] = useState(null); // is Google Play usable on this phone (Android app only)
  const orderBased = isOrderBased(businessTypeOf(user));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null); // { tone, text } about a payment we just checked
  const [period, setPeriod] = useState('monthly');
  const [buying, setBuying] = useState(''); // plan key while we send the person to Paystack
  const [checking, setChecking] = useState(false);
  const [lastReference, setLastReference] = useState('');
  const [renewChoice, setRenewChoice] = useState(null); // the "Renew automatically" box; null = not touched yet
  const [renewBusy, setRenewBusy] = useState(false);
  const previewSet = useRef(false);
  const [googleBusy, setGoogleBusy] = useState(false); // restoring or opening Google Play
  const handled = useRef(false);

  useEffect(() => {
    if (!android) return;
    googleBillingAvailable().then(setGoogleReady);
  }, [android]);

  const load = useCallback(async () => {
    const fresh = await getBilling();
    setData(fresh);
    // a business that picked a yearly plan when signing up sees yearly prices first
    const pick = fresh.subscription && fresh.subscription.preview;
    if (pick && !previewSet.current) {
      previewSet.current = true;
      setPeriod(pick.interval === 'yearly' ? 'yearly' : 'monthly');
    }
    return fresh;
  }, []);

  // Asks the server whether a payment went through. Safe to repeat.
  const checkPayment = useCallback(
    async (reference) => {
      setChecking(true);
      setError('');
      try {
        const result = await verifyPayment(reference);
        const base = outcomeMessage(result.outcome, result.subscription ? result.subscription.planName : '');
        const renew = result.outcome === 'success' ? autoRenewResultMessage(result.autoRenew) : null;
        setNotice(base && renew ? { tone: renew.tone === 'good' ? base.tone : 'warn', text: `${base.text} ${renew.text}` } : base);
        if (result.outcome !== 'pending') setLastReference('');
        await load();
        // tells the banner at the top of the page to look again
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('logbase:billing-changed'));
      } catch (err) {
        setError(err.message);
      } finally {
        setChecking(false);
      }
    },
    [load]
  );

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Paystack sends the person back here with ?reference=...
    if (handled.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (reference) {
      handled.current = true;
      setLastReference(reference);
      window.history.replaceState(null, '', window.location.pathname);
      checkPayment(reference);
    }
  }, [load, checkPayment]);

  // Android app: Google Play takes the payment, our server checks it with Google and gives the plan
  async function chooseOnGoogle(planKey) {
    setError('');
    setNotice(null);
    setBuying(planKey);
    try {
      const productId = `${planKey}_${period}`;
      const result = await buyPlan(productId, data.google.accountToken);
      if (result.cancelled) return;
      if (result.pending) {
        setNotice({ tone: 'warn', text: result.message || 'Your payment is still being processed by Google Play. Your plan starts as soon as it is confirmed.' });
      } else {
        const name = result.subscription ? result.subscription.planName : '';
        setNotice({ tone: 'good', text: name ? `Thank you! Your ${name} plan is now active.` : 'Thank you! Your plan is now active.' });
      }
      await load();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('logbase:billing-changed'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBuying('');
    }
  }

  async function restoreOnGoogle() {
    setError('');
    setNotice(null);
    setGoogleBusy(true);
    try {
      const result = await restorePlan(data.google.accountToken);
      if (result.none) {
        setNotice({ tone: 'warn', text: 'No plan was found on this Google Play account.' });
      } else {
        setNotice({ tone: 'good', text: 'Your plan was found and restored.' });
        await load();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('logbase:billing-changed'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function choose(planKey) {
    if (android) return chooseOnGoogle(planKey);
    setError('');
    setNotice(null);
    setBuying(planKey);
    try {
      const { authorizationUrl } = await startCheckout(planKey, period, renewOn);
      window.location.href = authorizationUrl; // leave for Paystack; the button stays busy until the page changes
    } catch (err) {
      setError(err.message);
      setBuying('');
    }
  }

  async function changeRenewal(action) {
    setError('');
    setNotice(null);
    if (action === 'remove' && !window.confirm('Remove your saved card? Your plan will not renew by itself any more.')) return;
    setRenewBusy(true);
    try {
      const result = action === 'remove' ? await removeSavedCard() : await setAutoRenew(action === 'on');
      setData((prev) => ({ ...prev, autoRenew: result.autoRenew }));
      setRenewChoice(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('logbase:billing-changed'));
    } catch (err) {
      setError(err.message);
    } finally {
      setRenewBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading billing…" />;

  const sub = data && data.subscription;
  const preview = sub && sub.preview; // picked a paid plan at sign-up and has not paid yet
  const noun = (sub && sub.orderNoun) || 'orders'; // what the orders are called: laundry orders or tailoring orders
  const renew = !android && data && data.autoRenew; // (the Android app has no card renewal: Google Play renews) missing on an older server: then there is simply no automatic renewal to show
  // the box starts ticked (with the wording next to the plans); once a card is saved it follows the saved setting
  const renewOn = !renew ? false : renewChoice !== null ? renewChoice : renew.card ? renew.enabled : true;
  const renewNotice = autoRenewNotice(renew);
  const status = statusOf(sub);
  const plans = (data && data.plans) || [];
  const freeOrderLimit = (plans.find((p) => p.key === 'free') || { limits: {} }).limits.orders; // the Free plan's orders a month (laundry and tailoring)
  const runningPaid = sub && sub.state === 'active' ? PLAN_ORDER.indexOf(sub.plan) : -1;
  const google = (data && data.google) || null;
  const canPay = android ? Boolean(google && google.configured && googleReady) : Boolean(data && data.configured);
  const googleManaged = android && Boolean(google && google.managed); // bought on Android and renewed by Google: changed in Google Play

  return (
    <>
      <PageHeader title="Billing" subtitle="Your plan, what you are using, and your payments. Only you can see this page." />

      <ErrorBanner message={error} />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {checking && <p className="mb-4 text-sm text-gray-500">Checking your payment with Paystack…</p>}
      {lastReference && !checking && notice && notice.tone === 'warn' && (
        <button
          type="button"
          onClick={() => checkPayment(lastReference)}
          className="mb-4 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Check again
        </button>
      )}

      {data && !canPay && !(android && googleReady === null) && (
        <Notice tone="warn">
          {android && google && google.configured
            ? 'Google Play payments are not available on this phone right now. Make sure Google Play is installed and you are signed in, then try again. Your account works as normal.'
            : 'Online payments are not switched on yet, so plans cannot be bought for now. Your account works as normal.'}
        </Notice>
      )}

      {googleManaged && (
        <Notice tone="good">
          Your plan was bought with Google Play and renews there{google.expiresAt ? ` (next on ${formatDate(google.expiresAt)})` : ''}. To change or cancel it, open Google Play.
          <button
            type="button"
            onClick={() => {
              setGoogleBusy(true);
              manageInGooglePlay().finally(() => setGoogleBusy(false));
            }}
            disabled={googleBusy}
            className="mt-2 block rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
          >
            Manage in Google Play
          </button>
        </Notice>
      )}

      {preview && (
        <Notice tone="good">
          You picked the {preview.planName} plan when you signed up. Try LogBase with {sub.freeOrders ? `up to ${preview.orders} ${noun}` : `up to ${preview.units} units in stock`}, then pay for {preview.planName} below to keep going.
        </Notice>
      )}

      {renewNotice && <Notice tone={renewNotice.tone}>{renewNotice.text}</Notice>}

      {sub && status && (
        <section className={`${cardClass} mb-6 p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{preview ? preview.planName : sub.planName} plan</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.tone === 'good' ? 'bg-green-100 text-green-700' : status.tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {status.label}
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-600">{status.detail}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {orderBased ? (
              sub.trialOrders ? (
                <Meter label={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} in your free trial`} used={sub.trialOrders.used} limit={sub.trialOrders.limit} />
              ) : (
                sub.freeOrders && <Meter label={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${preview ? 'in your test' : 'this month'}`} used={sub.freeOrders.used} limit={sub.freeOrders.limit} />
              )
            ) : (
              <Meter label="Units in stock" used={data.usage.stocks} limit={sub.limits.stocks} />
            )}
            <Meter label="Staff accounts" used={data.usage.staff} limit={sub.limits.staff} />
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {orderBased
              ? `${freeOrderLimit ? `The Free plan lets you take ${freeOrderLimit} ${noun} each month.` : 'The Free plan limits how many orders you can take each month.'} Starter and Business have no limit. What you already took stays here, and you can keep working on it.`
              : 'If you go over a limit, you can still sell and use everything you already have. You just cannot add more stock or staff until you upgrade. Selling stock makes room again.'}
          </p>

          {renew && (renew.card || sub.state === 'active') && (
            <div className="mt-4 border-t border-gray-100 pt-4" data-section="auto-renew">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Automatic renewal</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${renew.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {renew.enabled ? 'On' : 'Off'}
                </span>
              </div>
              {renew.enabled ? (
                <p className="mt-1 text-sm text-gray-600">
                  We will charge your {cardText(renew.card)} {formatMoney(renew.amount)} about a day before {renew.renewsOn ? formatDate(renew.renewsOn) : 'your plan ends'}, and email you each time.
                </p>
              ) : renew.card ? (
                <p className="mt-1 text-sm text-gray-600">
                  Your plan will not renew by itself. Saved card: {cardText(renew.card)}.
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-600">
                  Your plan will not renew by itself. When you pay below with a debit card, tick “Renew automatically”.
                </p>
              )}
              {renew.card && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {renew.enabled ? (
                    <button
                      type="button"
                      onClick={() => changeRenewal('off')}
                      disabled={renewBusy}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Turn off
                    </button>
                  ) : (
                    sub.state === 'active' && (
                      <button
                        type="button"
                        onClick={() => changeRenewal('on')}
                        disabled={renewBusy}
                        className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                      >
                        Turn on
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => changeRenewal('remove')}
                    disabled={renewBusy}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove card
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Plans</h2>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm" role="group" aria-label="Billing period">
          {[
            { key: 'monthly', label: 'Monthly' },
            { key: 'yearly', label: 'Yearly' },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setPeriod(o.key)}
              aria-pressed={period === o.key}
              className={`rounded-md px-3 py-1.5 font-medium transition ${period === o.key ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {o.label}
              {o.key === 'yearly' && <span className="ml-1 text-xs font-normal opacity-80">2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      {data && data.configured && renew && !android && (
        <label className="mb-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700" data-section="renew-choice">
          <input
            type="checkbox"
            checked={renewOn}
            onChange={(e) => setRenewChoice(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Renew automatically</span>
            <span className="block text-xs text-gray-500">
              We keep the debit card you pay with and charge it again about a day before each {period === 'monthly' ? 'month' : 'year'} ends, for the same plan and price. We email you each time. You can turn it off any time on this page. It only works with a card, not a bank transfer.
            </span>
          </span>
        </label>
      )}

      <div className="mb-3 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const index = PLAN_ORDER.indexOf(plan.key);
          const isCurrent = preview ? preview.plan === plan.key : sub && sub.plan === plan.key; // while trying a plan out, the plan they picked is the highlighted one
          const paid = plan.key !== 'free';
          const blocked = paid && index < runningPaid; // a lower plan while a higher one is still running
          const saving = yearlySaving(plan);
          let label = `Choose ${plan.name}`;
          if (preview && paid) label = `Pay for ${plan.name}`;
          else if (isCurrent && sub.state === 'active') label = `Renew ${plan.name}`;
          else if (sub && PLAN_ORDER.indexOf(sub.plan) < index && sub.state !== 'trialing') label = `Upgrade to ${plan.name}`;
          return (
            <section
              key={plan.key}
              data-plan={plan.key}
              className={`flex flex-col rounded-xl border bg-white p-4 sm:p-5 ${isCurrent ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                {isCurrent && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{preview ? 'Your pick' : 'Your plan now'}</span>}
              </div>
              <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
              <p className="mt-4 text-2xl font-semibold text-gray-900">
                {priceText(plan, period)}
                {paid && <span className="ml-1 text-sm font-normal text-gray-500">/ {period === 'monthly' ? 'month' : 'year'}</span>}
              </p>
              <p className="h-5 text-xs text-green-700">{paid && period === 'yearly' && saving > 0 ? `You save ${formatMoney(saving)} a year` : ''}</p>

              <ul className="mt-3 flex-1 space-y-2 text-sm">
                {planLines(plan, { orderNoun: orderBased ? noun : undefined }).map((line) => (
                  <li key={line.text} className={`flex gap-2 ${line.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                    <span aria-hidden="true" className={line.included ? 'text-green-600' : 'text-gray-300'}>
                      {line.included ? '✓' : '–'}
                    </span>
                    <span>{line.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {paid ? (
                  <>
                    <button
                      type="button"
                      onClick={() => choose(plan.key)}
                      disabled={Boolean(buying) || blocked || !canPay || googleManaged}
                      className={`${primaryButtonClass} w-full`}
                    >
                      {buying === plan.key ? (android ? 'Opening Google Play…' : 'Taking you to Paystack…') : label}
                    </button>
                    {blocked && <p className="mt-2 text-xs text-gray-500">You can switch to this plan after your current plan ends.</p>}
                  </>
                ) : (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-sm text-gray-500">
                    {preview ? 'Free is chosen when you sign up' : isCurrent ? 'You are on this plan' : 'What you get after a plan ends'}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {android && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={restoreOnGoogle}
            disabled={googleBusy || Boolean(buying) || !canPay}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {googleBusy ? 'Checking…' : 'Restore purchase'}
          </button>
          <span className="text-xs text-gray-500">Already paid on this Google account? Tap to bring your plan back.</span>
        </div>
      )}

      <p className="mb-8 text-xs text-gray-500">
        {android
          ? 'You pay for the period you choose with Google Play, and Google renews it each period until you cancel it in Google Play. Changing to a different plan starts a new period today, and unused days on the old plan are not carried over.'
          : 'You pay for the period you choose on Paystack.'}{android ? '' : ' Nothing renews by itself unless “Renew automatically” is ticked when you pay. Renewing the same plan adds the time to the end of what you have. Changing to a different plan starts a new period today, and unused days on the old plan are not carried over.'}
      </p>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Payments</h2>
        {data && data.payments.length === 0 ? (
          <div className={`${cardClass} p-6 text-center text-sm text-gray-500`}>No payments yet.</div>
        ) : (
          <ul className={`${cardClass} divide-y divide-gray-100`}>
            {(data ? data.payments : []).map((p) => {
              const st = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.pending;
              return (
                <li key={p._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize text-gray-900">
                      {p.plan} plan · {p.interval}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(p.paidAt || p.createdAt)}
                      {p.status === 'success' && p.periodEnd ? ` · runs to ${formatDate(p.periodEnd)}` : ''}
                      {p.renewal ? ' · automatic renewal' : ''}
                      {p.status === 'failed' && p.failureReason ? ` · ${p.failureReason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{formatMoney(p.amount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.style}`}>{st.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

// Inside the iPhone store app there are no plans, prices or Pay buttons (the store rules do not allow selling a
// subscription there), so this page only says so. Anyone who opens it by an old link or bookmark lands here.
// The Android app sells plans with Google Play Billing, so it shows the full page.
export default function BillingPage() {
  const inApp = usePlansHidden();
  if (!inApp) return <BillingScreen />;
  return (
    <>
      <PageHeader title="Billing" subtitle="Your plan and payments." />
      <div className={`${cardClass} p-8 text-center`}>
        <h2 className="text-base font-semibold text-gray-900">Plans and payments are not available in this app</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Your records are safe and everything else works as usual.</p>
      </div>
    </>
  );
}
