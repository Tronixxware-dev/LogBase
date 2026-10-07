import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import PricingSection from '@/components/site/PricingSection';
import { Icon } from '@/components/Icons';
import { SITE } from '@/lib/site';

export const metadata = {
  title: { absolute: `${SITE.name} | ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: '/' },
};

const FEATURES = [
  { icon: 'sales', title: 'Record sales in seconds', text: 'Pick the products, take the payment, print or share the receipt. Part payments and credit sales are built in.' },
  { icon: 'wifiOff', title: 'Works without internet', text: 'Keep selling when the network drops. Sales are saved on the device and sync by themselves when you are back online.' },
  { icon: 'products', title: 'Know your stock', text: 'See what is in stock, what is running low and what was adjusted, with IMEI and serial number tracking for phones and gadgets.' },
  { icon: 'customers', title: 'Who owes you', text: 'Every customer has a running balance. Record payments as they come in and never lose track of a debt again.' },
  { icon: 'expenses', title: 'Profit, not just sales', text: 'Add your expenses and purchases and see real profit and clear reports for any period.' },
  { icon: 'team', title: 'Staff with limits', text: 'Give each helper their own login and decide exactly what they can see and do. Owners keep the full picture.' },
];

const STEPS = [
  { n: '1', title: 'Create your account', text: 'Sign up with your email. No card is needed to start your free trial.' },
  { n: '2', title: 'Add your products', text: 'Type them in or import them from a spreadsheet, with your prices and opening stock.' },
  { n: '3', title: 'Start selling', text: 'Record sales, purchases and payments every day, and watch your dashboard tell you how the business is doing.' },
];

const BUILT_FOR = ['Phone and gadget shops', 'Provision stores', 'Pharmacies and chemists', 'Building materials', 'Fashion and boutiques', 'Wholesalers and distributors'];

const FAQ = [
  {
    q: 'Do I need a card to start?',
    a: `No. Your ${SITE.trialDays}-day free trial starts when you sign up and needs no card. You only pay if you decide to continue.`,
  },
  {
    q: 'What happens when my trial or subscription ends?',
    a: 'Your business moves to the Free plan. Nothing is deleted or hidden; the Free plan only limits how many new products you can add and does not include staff accounts. Subscribe again at any time to lift the limits.',
  },
  {
    q: 'Does it really work without internet?',
    a: 'Yes. LogBase is installed like an app on your phone or computer. Sales you record offline are saved on the device and sent to your account as soon as the connection returns, without being counted twice.',
  },
  {
    q: 'How do I pay?',
    a: 'Subscriptions are in naira and are paid securely through Paystack with a card. You can choose to have it renew automatically, and you can turn that off at any time.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes, at any time, by turning off automatic renewal in Billing. You keep your plan until the end of the period you paid for. See our Refund Policy for details.',
  },
  {
    q: 'Who can see my business data?',
    a: 'Only the people you give access to. Each business is kept separate from every other business on LogBase. Read our Privacy Policy for the details.',
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl animate-float-slow" />
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-xs">
            <Icon name="sparkle" className="h-3.5 w-3.5 text-primary" />
            Made for shops in Nigeria
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Run your shop with <span className="text-primary">clarity</span>, even when the network is down.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
            LogBase tracks your stock, records your sales and shows you who owes you, all in one place. It keeps working offline and syncs when you are back.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-dark">
              Start free trial
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <a href="#pricing" className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-6 py-3.5 text-base font-medium text-gray-800 shadow-xs transition hover:bg-gray-50">
              See pricing
            </a>
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-primary" />{SITE.trialDays}-day free trial</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-primary" />No card needed</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-primary" />Cancel anytime</span>
          </p>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}

// A drawn picture of the dashboard (not a screenshot, so it stays sharp in light and dark).
function ProductPreview() {
  const bars = [38, 52, 44, 66, 58, 82, 74];
  return (
    <div className="relative mb-6 animate-fade-up" style={{ animationDelay: "120ms" }} aria-hidden="true">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Today</p>
            <p className="text-2xl font-semibold tracking-tight text-gray-900">₦184,500</p>
          </div>
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">+12% this week</span>
        </div>
        <div className="mt-5 flex h-28 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-primary/80" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[['Sales', '27'], ['Low stock', '4'], ['Owed to you', '₦62k']].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-3">
              <p className="text-base font-semibold text-gray-900">{v}</p>
              <p className="text-[11px] text-gray-500">{k}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[['Adaeze O.', 'Paid', 'green'], ['Chuka M.', 'Part paid', 'amber'], ['Walk-in', 'Paid', 'green']].map(([n, s, c]) => (
            <div key={n} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <span className="text-gray-700">{n}</span>
              <span className={c === 'green' ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700' : 'rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700'}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-9 -left-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-lg sm:-left-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Icon name="wifiOff" className="h-4 w-4" /></span>
        <span>
          <span className="block font-medium text-gray-900">Offline</span>
          <span className="block text-xs text-gray-500">3 sales will sync</span>
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <Hero />

        <section aria-label="Who LogBase is for" className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 text-sm text-gray-500 sm:px-6">
            <span className="font-medium text-gray-700">Built for</span>
            {BUILT_FOR.map((b) => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Everything a shop needs, nothing it does not</h2>
            <p className="mt-4 text-gray-600">Simple enough for a busy counter, complete enough to run the books.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="hover-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-gray-200 bg-gray-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Up and running in an afternoon</h2>
            </div>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
                  <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white">{s.n}</span>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <PricingSection />

        <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Questions, answered</h2>
          <div className="mt-10 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-xs">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Icon name="chevron" className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="brand-gradient relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Give your shop a proper record</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">Try LogBase free for {SITE.trialDays} days. No card, no commitment.</p>
            <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#ffffff] px-6 py-3.5 text-base font-medium text-[#0f766e] shadow-lg transition hover:-translate-y-0.5">
              Start free trial
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
