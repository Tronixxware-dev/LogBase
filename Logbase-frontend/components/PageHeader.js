import Link from 'next/link';
import { Icon } from '@/components/Icons';

// Title row used at the top of every dashboard page.
// - backHref/backLabel: optional "Back to x" link above the title
// - action: optional element on the right (usually a <PrimaryLink>)
export default function PageHeader({ title, subtitle, backHref, backLabel, action }) {
  return (
    <div className="mb-7">
      {backHref && (
        <Link
          href={backHref}
          className="group mb-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-xs transition hover:text-primary"
        >
          <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" />
          {backLabel || 'Back'}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
