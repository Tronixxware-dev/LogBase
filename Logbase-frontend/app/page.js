import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import PricingSection from '@/components/site/PricingSection';
import HeroPhone from '@/components/site/HeroPhone';
import Reveal from '@/components/site/Reveal';
import { Icon } from '@/components/Icons';
import InstallButton from '@/components/InstallButton';
import { BrandMark } from '@/components/Navbar';
import { SITE } from '@/lib/site';

export const metadata = {
  title: { absolute: `${SITE.name} | ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: '/' },
};

const BUILT_FOR = ['Provision stores and supermarkets', 'Phone and gadget sellers', 'Pharmacies and chemists', 'Building materials', 'Fashion and boutiques', 'Wholesalers and distributors', 'Salons, restaurants and services'];

const PAINS = [
  {
    problem: 'The network dropped in the middle of a sale.',
    fix: 'LogBase keeps recording. Sales are saved on your phone and send themselves when the internet is back.',
  },
  {
    problem: 'A customer owes you and nobody remembers how much.',
    fix: 'Every customer has a running balance. Record part payments as they come in.',
  },
  {
    problem: 'The stock count never matches what is on the shelf.',
    fix: 'Every purchase, sale, return and adjustment is logged, with IMEI and serial tracking for phones.',
  },
];

const STEPS = [
  { n: '1', title: 'Create your account', text: 'Sign up with your email. No card is needed to start your free trial.' },
  { n: '2', title: 'Add your products', text: 'Type them in or import them from a spreadsheet, with your prices and opening stock.' },
  { n: '3', title: 'Start selling', text: 'Record sales, purchases and payments every day, and watch your dashboard tell you how the business is doing.' },
];

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
  {
    q: 'Can I download my data?',
    a: 'Yes. Your records are yours. The owner can open Import & export in the dashboard and download products and stock, customers, sales, purchases and expenses as CSV files that open in Excel or Google Sheets. It is included in every plan.',
  },
];

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#04302c] sm:rounded-[2.25rem]">
        {/* soft colour and a faint grid, both fading out toward the bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(52rem 28rem at 88% -5%, rgba(45,212,191,0.30), transparent 62%), radial-gradient(40rem 26rem at -5% 105%, rgba(13,148,136,0.40), transparent 62%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <h1 className="text-[2.35rem] font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
              The{' '}
              <span className="bg-gradient-to-r from-[#5eead4] to-[#bbf7d0] bg-clip-text text-transparent">digital log book</span>{' '}
              for your business, even when the network is down.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#a9cdc7] sm:text-lg">
              Every sale, purchase and stock change gets written down in LogBase, even with no signal, and sent to your account the moment you are back online. Your stock, debts and profit always add up.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ffffff] px-6 py-3.5 text-base font-semibold text-[#0f766e] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 sm:w-auto"
              >
                Start free trial
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
              <div className="flex gap-3 sm:contents">
                <a
                  href="#how"
                  className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-4 py-3.5 text-base font-medium text-white backdrop-blur transition hover:bg-white/15 sm:flex-none sm:px-6"
                >
                  How it works
                </a>
                <InstallButton variant="ghost" label="Install app" className="flex flex-1 justify-center sm:inline-flex sm:flex-none" />
              </div>
            </div>

            <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[#8dbab3]">
              <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-[#5eead4]" />{SITE.trialDays}-day free trial</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-[#5eead4]" />No card needed</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-[#5eead4]" />Cancel anytime</span>
            </p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '140ms' }}>
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Who it is for, and the problems it solves                           */
/* ------------------------------------------------------------------ */

function BuiltFor() {
  return (
    <section aria-label="Who LogBase is for" className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500 sm:gap-3">
        <span className="w-full text-center font-medium text-gray-700 sm:w-auto sm:pr-2">Built for</span>
        {BUILT_FOR.map((b) => (
          <span key={b} className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs shadow-xs sm:text-sm">
            {b}
          </span>
        ))}
      </div>
    </section>
  );
}

function Problems() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-[1.7rem] font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl">Sound familiar?</h2>
        <p className="mt-4 text-gray-600">The everyday trouble of running a business, and what LogBase does about it.</p>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-3 md:gap-5">
        {PAINS.map((p, i) => (
          <Reveal key={p.problem} delay={i * 90}>
            <div className="hover-lift flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Icon name="alert" className="h-4.5 w-4.5" />
              </span>
              <p className="mt-4 text-lg font-semibold leading-snug text-gray-900">{p.problem}</p>
              <div className="my-5 h-px bg-gray-200" />
              <p className="flex gap-3 text-sm leading-relaxed text-gray-600">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />
                </span>
                {p.fix}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features (a grid of cards with small drawn pictures)                */
/* ------------------------------------------------------------------ */

function FeatureCard({ icon, title, text, className = '', children }) {
  return (
    <div className={`hover-lift relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-xs ${className}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">{text}</p>
      {children && <div className="mt-6 flex-1">{children}</div>}
    </div>
  );
}

function Chip({ tone, icon, title, sub }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    teal: 'bg-teal-50 text-teal-700',
    green: 'bg-green-50 text-green-700',
  };
  return (
    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon name={icon} className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{sub}</span>
      </span>
    </div>
  );
}

function Pill({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    teal: 'bg-teal-50 text-teal-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function Features() {
  const bars = [34, 48, 42, 62, 54, 78, 70];
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-[1.7rem] font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl">Everything a business needs, nothing it does not</h2>
        <p className="mt-4 text-gray-600">Simple enough for a busy counter, complete enough to run the books.</p>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-6">
        <Reveal className="lg:col-span-4">
          <FeatureCard
            className="h-full"
            icon="wifiOff"
            title="Works without internet"
            text="Keep selling when the network drops. Sales are saved on the device and sync by themselves when you are back online, without ever being counted twice."
          >
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <Chip tone="amber" icon="wifiOff" title="No signal" sub="You keep selling" />
              <Icon name="arrowRight" className="hidden h-4 w-4 shrink-0 text-gray-300 sm:block" />
              <Chip tone="teal" icon="sales" title="Saved on the phone" sub="3 sales waiting" />
              <Icon name="arrowRight" className="hidden h-4 w-4 shrink-0 text-gray-300 sm:block" />
              <Chip tone="green" icon="check" title="Back online" sub="Sent. No double entry" />
            </div>
          </FeatureCard>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={80}>
          <FeatureCard
            className="h-full"
            icon="sales"
            title="Record sales in seconds"
            text="Pick the products, take the payment, share the receipt. Part payments and credit sales are built in."
          >
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-sm">
              <div className="flex justify-between text-gray-700"><span>Office printer</span><span className="tabular font-medium">₦210,000</span></div>
              <div className="flex justify-between text-gray-500"><span>Paid now</span><span className="tabular">₦150,000</span></div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-gray-900">
                <span className="font-medium">Balance</span>
                <span className="flex items-center gap-2"><Pill tone="amber">Part paid</Pill><span className="tabular font-semibold">₦60,000</span></span>
              </div>
            </div>
          </FeatureCard>
        </Reveal>

        <Reveal className="lg:col-span-2">
          <FeatureCard
            className="h-full"
            icon="products"
            title="Know your stock"
            text="See what is in stock, what is running low and what was adjusted, with IMEI and serial number tracking."
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                <span className="tabular text-gray-600">IMEI 3568 •••• 4421</span><Pill tone="green">In stock</Pill>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                <span className="text-gray-600">Phone charger</span><Pill tone="amber">2 left</Pill>
              </div>
            </div>
          </FeatureCard>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={80}>
          <FeatureCard
            className="h-full"
            icon="customers"
            title="Who owes you"
            text="Every customer has a running balance. Record payments as they come in and never lose track of a debt."
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                <span className="text-gray-700">Chuka M.</span><span className="tabular font-semibold text-amber-700">owes ₦25,000</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                <span className="text-gray-700">Adaeze O.</span><Pill tone="green">Cleared</Pill>
              </div>
            </div>
          </FeatureCard>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={160}>
          <FeatureCard
            className="h-full"
            icon="expenses"
            title="Profit, not just sales"
            text="Add your expenses and purchases and see real profit for any period."
          >
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5">
              <div className="flex h-14 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary" style={{ height: `${h}%`, opacity: 0.4 + i * 0.09 }} />
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">Profit this week <span className="tabular font-semibold text-gray-900">₦48,200</span></p>
            </div>
          </FeatureCard>
        </Reveal>

        <Reveal className="lg:col-span-3">
          <FeatureCard
            className="h-full"
            icon="team"
            title="Staff with limits"
            text="Give each helper their own login and decide exactly what they can see and do. Owners keep the full picture."
          >
            <div className="space-y-2">
              {[['Record sales', true], ['See profit', false], ['Change prices', false]].map(([label, on]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {label}
                  <span className={`flex h-5 w-9 items-center rounded-full p-0.5 ${on ? 'justify-end bg-primary' : 'justify-start bg-gray-300'}`}>
                    <span className="h-4 w-4 rounded-full bg-[#ffffff] shadow" />
                  </span>
                </div>
              ))}
            </div>
          </FeatureCard>
        </Reveal>

        <Reveal className="lg:col-span-3" delay={80}>
          <FeatureCard
            className="h-full"
            icon="bolt"
            title="Installs like an app"
            text="Add LogBase to your phone or computer and open it from the home screen like any other app. No app store needed."
          >
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-3.5">
              <BrandMark className="h-12 w-12" />
              <span className="text-sm">
                <span className="block font-semibold text-gray-900">LogBase</span>
                <span className="block text-xs text-gray-500">Opens full screen, even with a weak connection</span>
              </span>
            </div>
          </FeatureCard>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-gray-200 bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-[1.7rem] font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl">Up and running in an afternoon</h2>
          <p className="mt-4 text-gray-600">Three steps, and you do not need to be good with computers.</p>
        </Reveal>
        <ol className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n}>
              <Reveal delay={i * 90} className="h-full">
                <div className="relative h-full overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
                  <span aria-hidden="true" className="absolute -right-2 -top-4 select-none text-[6.5rem] font-bold leading-none text-primary/10">{s.n}</span>
                  <span className="brand-gradient relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow-md">{s.n}</span>
                  <h3 className="relative mt-5 text-lg font-semibold text-gray-900">{s.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-gray-600">{s.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ and the closing call to action                                  */
/* ------------------------------------------------------------------ */

function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <Reveal>
        <h2 className="text-center text-balance text-[1.7rem] font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl">Questions, answered</h2>
        <div className="mt-10 divide-y divide-gray-200 rounded-3xl border border-gray-200 bg-white shadow-xs">
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
      </Reveal>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="px-3 pb-3 sm:px-4 sm:pb-4">
      <Reveal>
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-[#04302c] px-5 py-14 text-center sm:rounded-[2.25rem] sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'radial-gradient(40rem 22rem at 50% -10%, rgba(45,212,191,0.32), transparent 65%), radial-gradient(30rem 20rem at 100% 100%, rgba(13,148,136,0.35), transparent 65%)',
            }}
          />
          <h2 className="mx-auto max-w-2xl text-balance text-[1.8rem] font-semibold leading-tight tracking-tight text-white sm:text-5xl">Give your business a proper record</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#a9cdc7]">Try LogBase free for {SITE.trialDays} days. No card, no commitment.</p>
          <Link
            href="/signup"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ffffff] px-7 py-3.5 text-base font-semibold text-[#0f766e] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 sm:w-auto"
          >
            Start free trial
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <Hero />
        <BuiltFor />
        <Problems />
        <Features />
        <HowItWorks />
        <PricingSection />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
