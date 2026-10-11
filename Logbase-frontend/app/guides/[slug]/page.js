import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import JsonLd from '@/components/site/JsonLd';
import { GUIDES, getGuide } from '@/lib/guides';
import { SITE } from '@/lib/site';

// This file goes in the folder  app/guides/[slug]/page.js  (the folder name has square brackets).

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { type: 'article', title: guide.title, description: guide.description, publishedTime: guide.published },
  };
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const related = (guide.related || []).map(getGuide).filter(Boolean);

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.published,
    dateModified: guide.published,
    mainEntityOfPage: `${SITE.url}/guides/${guide.slug}`,
    author: { '@type': 'Organization', name: SITE.company },
    publisher: { '@type': 'Organization', name: SITE.company, logo: { '@type': 'ImageObject', url: `${SITE.url}/icons/icon-512.png` } },
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/` },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE.url}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${SITE.url}/guides/${guide.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
          <Link href="/" className="hover:text-primary">{SITE.name}</Link> / <Link href="/guides" className="hover:text-primary">Guides</Link>
        </nav>
        <article>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{guide.title}</h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">{guide.intro}</p>

          <div className="mt-10 space-y-10">
            {guide.sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">{s.title}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-600">
                  {(s.paras || []).map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {s.items && (
                    <ul className="list-disc space-y-2 pl-5 marker:text-gray-400">
                      {s.items.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </article>

        <div className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Try LogBase free for {SITE.trialDays} days</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
            Track stock, record sales and see who owes you, even without internet. No card needed to start.
          </p>
          <Link href="/signup" className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">
            Start free trial
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">More guides</h2>
            <ul className="mt-4 space-y-3">
              {related.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className="font-medium text-primary underline-offset-2 hover:underline">
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
      <JsonLd data={article} />
      <JsonLd data={crumbs} />
    </div>
  );
}
