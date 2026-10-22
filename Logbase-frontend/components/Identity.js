'use client';

// The top of a receipt, job slip or statement: the logo, the business name, and the address / phone lines the
// administrator chose to show (Settings > Organization). `title` is the small spaced-out words under it ("Sales receipt").

import { identityLines } from '@/lib/settings';

export default function IdentityHeader({ org, name, title, align = 'center' }) {
  const o = org || {};
  const showLogo = o.logoUrl && (!o.receipt || o.receipt.showLogo !== false);
  const lines = identityLines(o);
  const left = align === 'left';
  return (
    <header className={left ? 'text-left' : 'text-center'}>
      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={o.logoUrl} alt="" className={`mb-3 h-16 max-w-[11rem] object-contain sm:h-20 ${left ? '' : 'mx-auto'}`} />
      )}
      <h1 className={left ? 'text-xl font-semibold text-gray-900' : 'text-balance text-2xl font-extrabold uppercase tracking-wide text-gray-900 sm:text-3xl'}>{name || o.name}</h1>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 break-words text-xs leading-snug text-gray-500">
          {line}
        </p>
      ))}
      {title && <p className={`mt-2 text-xs font-semibold uppercase text-gray-500 ${left ? 'tracking-wide' : 'tracking-[0.35em]'}`}>{title}</p>}
    </header>
  );
}
