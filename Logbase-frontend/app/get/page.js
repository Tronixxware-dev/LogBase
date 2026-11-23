import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { APP_LINKS, SITE } from '@/lib/site';

// The page every QR code, flyer and t-shirt points to: mylogbase.com/get
// Android phone -> Google Play. iPhone -> the App Store (once its link is set in lib/site.js). Anything else sees both buttons.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the LogBase app',
  description: `Download ${SITE.name} for Android, or use it in your browser. Free to start.`,
  alternates: { canonical: '/get' },
};

export default async function GetApp({ searchParams }) {
  const ua = (await headers()).get('user-agent') || '';
  const query = (await searchParams) || {};
  // /get?stay=1 shows the page without redirecting (useful for checking it)
  if (!query.stay) {
    if (/android/i.test(ua)) redirect(APP_LINKS.android);
    if (/iPhone|iPad|iPod/i.test(ua) && APP_LINKS.ios) redirect(APP_LINKS.ios);
  }

  const iosReady = Boolean(APP_LINKS.ios);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-14 text-center sm:px-6 sm:pt-20">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Get the {SITE.name} app</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          Track your stock, record sales and see who owes you, even without internet. Free to start, no card needed.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href={APP_LINKS.android}
            className="flex items-center justify-center gap-3 rounded-2xl bg-gray-900 px-6 py-4 text-left text-white shadow-xs transition hover:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M4 3.4v17.2a1 1 0 0 0 1.5.86l14.6-8.6a1 1 0 0 0 0-1.72L5.5 2.54A1 1 0 0 0 4 3.4Z" />
            </svg>
            <span>
              <span className="block text-xs text-gray-300">Get it on</span>
              <span className="block text-lg font-semibold leading-tight">Google Play</span>
            </span>
          </a>

          {iosReady ? (
            <a
              href={APP_LINKS.ios}
              className="flex items-center justify-center gap-3 rounded-2xl bg-gray-900 px-6 py-4 text-left text-white shadow-xs transition hover:bg-gray-800"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.15-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.85-1.6 0-3.1.95-4 2.4-1.7 3-.45 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.45 1.2-.05 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.75 1.3 0 2.2-1.2 3-2.4.95-1.4 1.3-2.7 1.35-2.8-.05 0-2.6-1-2.7-4ZM14 5.4c.7-.85 1.15-2 1-3.15-1 .05-2.2.65-2.9 1.5-.65.75-1.2 1.95-1.05 3.1 1.1.1 2.2-.55 2.95-1.45Z" />
              </svg>
              <span>
                <span className="block text-xs text-gray-300">Download on the</span>
                <span className="block text-lg font-semibold leading-tight">App Store</span>
              </span>
            </a>
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 px-6 py-4 text-left text-gray-500">
              <span>
                <span className="block text-lg font-semibold leading-tight text-gray-700">iPhone app</span>
                <span className="block text-xs">Coming soon</span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-left">
          <p className="font-medium text-gray-900">On an iPhone, or on a computer?</p>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
            {SITE.name} works in your browser too. Open it, sign up, and on an iPhone tap Share, then Add to Home Screen, to keep it like an app.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Use {SITE.name} in your browser
            </Link>
            <Link href="/" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-white">
              Learn more
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
