import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { SITE } from '@/lib/site';

// The shared frame for Terms, Privacy, Refund Policy and Contact.
export default function LegalPage({ title, intro, children, showUpdated = true }) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
        {showUpdated && <p className="mt-3 text-sm text-gray-500">Last updated {SITE.updated}</p>}
        {intro && <p className="mt-6 text-lg leading-relaxed text-gray-600">{intro}</p>}
        <div className="mt-10 space-y-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-600">{children}</div>
    </section>
  );
}

export function List({ items }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-gray-400">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export function Mail({ children }) {
  return (
    <a href={`mailto:${SITE.email}`} className="font-medium text-primary underline-offset-2 hover:underline">
      {children || SITE.email}
    </a>
  );
}
