'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { useAgent } from '@/components/agent/AgentData';
import { Card, Empty, Note, PageTitle, Stat, shopStatus, trialBadge } from '@/components/agent/parts';

function ShopsTab({ data, followUp }) {
  const { shops, totals, rules } = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Registered" value={totals.shops} />
        <Stat label="Activated" value={totals.activated} />
        <Stat label="Paying now" value={totals.payingNow} />
      </div>

      {followUp.length > 0 && (
        <Card title="Follow up: free trials ending" action={<Badge tone="amber">{followUp.length}</Badge>}>
          <ul className="divide-y divide-gray-100">
            {followUp.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                  <div className="mt-1">{trialBadge(s.trial)}</div>
                </div>
                {s.phone ? (
                  <div className="flex gap-2">
                    <a href={`tel:${s.phone}`} className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark">
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${String(s.phone).replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hello ${s.name}, your free LogBase trial is ending soon. Subscribe on mylogbase.com to keep your sales and stock safe.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      WhatsApp
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No phone number</span>
                )}
                <Link href={`/agent/mail?shop=${s._id}`} className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
                  Email
                </Link>
              </li>
            ))}
          </ul>
          <Note>These businesses signed up with your code but have not paid yet.</Note>
        </Card>
      )}

      <Card title="Shops you registered">
        {shops.length === 0 ? (
          <Empty>Nobody has signed up with your code yet. Show your QR code to your first shop owner.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shops.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="mb-1.5 text-xs text-gray-500">Signed up {formatDate(s.signedUpAt)}</p>
                  {shopStatus(s, rules)}
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-semibold text-gray-900">{formatMoney(s.earned)}</p>
                  <p className="text-[11px] text-gray-400">you earned</p>
                  <Link href={`/agent/mail?shop=${s._id}`} className="mt-1.5 inline-block text-xs font-semibold text-primary hover:underline">
                    Email them
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function AgentShopsPage() {
  const { data } = useAgent();
  // shops that signed up but have not paid: the ones whose trial is about to end (or just ended) come first
  const followUp = data.shops
    .filter((s) => s.state === 'not_paid' && s.trial)
    .sort((a, b) => a.trial.daysLeft - b.trial.daysLeft)
    .slice(0, 30);
  return (
    <>
      <PageTitle
        title="Shops"
        subtitle="Every business that signed up with your code."
        action={
          <Link href="/agent/mail" className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark">
            Email shops
          </Link>
        }
      />
      <ShopsTab data={data} followUp={followUp} />
    </>
  );
}
