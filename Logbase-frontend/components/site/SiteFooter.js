import Link from 'next/link';
import { SITE } from '@/lib/site';
import { BrandMark } from '@/components/Navbar';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/#faq', label: 'FAQ' },
      { href: '/signup', label: 'Start free trial' },
      { href: '/login', label: 'Log in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/refund-policy', label: 'Refund Policy' },
    ],
  },
  {
    title: 'Company',
    links: [{ href: '/contact', label: 'Contact us' }],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight text-gray-900">LogBase</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-gray-500">
            {SITE.tagline}. LogBase is a product of {SITE.company}. Subscriptions are paid securely through Paystack.
          </p>
          <a href={`mailto:${SITE.email}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            {SITE.email}
          </a>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-600 transition hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-gray-400 sm:px-6">
          © {new Date().getFullYear()} {SITE.company}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
