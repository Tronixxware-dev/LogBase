import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import JsonLd from '@/components/site/JsonLd';
import { GUIDES } from '@/lib/guides';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Guides for shop and business owners',
  description: `Simple guides on stock, customer debts, offline selling and IMEI tracking, from the team behind ${SITE.name}.`,
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Guides for shop and business owners</h1>
        <p className="mt-6 text-lg leading-relaxed text-gray-600">
          Plain-language help for running a business in Nigeria: keeping stock right, collecting what you are owed, selling when the network is bad and tracking phones by IMEI.
        </p>
        <ul className="mt-10 space-y-4">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-xs transition hover:border-primary/40 hover:shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">{g.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{g.short}</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">Read the guide →</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/` },
            { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE.url}/guides` },
          ],
        }}
      />
    </div>
  );
}
