'use client';

import { Badge } from '@/components/ui';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useAgent } from '@/components/agent/AgentData';
import { Card, Empty, Note, PageTitle, Stat, TYPE_LABEL, plural } from '@/components/agent/parts';

function MoneyTab({ data }) {
  const { totals, earnings, payouts, rules } = data;
  const types = [
    ['New Shop Bonus', totals.byType.new_shop],
    ['Renewals', totals.byType.renewal],
    ['Weekly bonuses', totals.byType.weekly],
    ['Milestones', totals.byType.milestone],
    ...(totals.byType.adjustment ? [['Corrections', totals.byType.adjustment]] : []),
  ];
  const top = Math.max(1, ...types.map(([, v]) => Math.abs(v || 0)));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Waiting to be paid" value={formatMoney(totals.owed)} tone={totals.owed > 0 ? 'amber' : undefined} sub={totals.held > 0 ? `${formatMoney(totals.payable)} payable now` : undefined} />
        <Stat label="Held" value={formatMoney(totals.held)} sub={totals.held > 0 ? `until ${formatDate(totals.nextPayableOn)}` : 'nothing on hold'} />
        <div className="col-span-2 sm:col-span-1">
          <Stat label="Paid to you" value={formatMoney(totals.paid)} sub="all time" />
        </div>
      </div>

      <Card title="Where your money comes from">
        <ul className="space-y-3">
          {types.map(([label, value]) => (
            <li key={label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="tabular font-semibold text-gray-900">{formatMoney(value || 0)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(0, Math.min(100, ((value || 0) / top) * 100))}%` }} />
              </div>
            </li>
          ))}
        </ul>
        {totals.pending > 0 && (
          <Note>
            + {formatMoney(totals.pending)} more if your {plural(totals.pendingShops, 'getting-started shop')} get{totals.pendingShops === 1 ? 's' : ''} going.
          </Note>
        )}
      </Card>

      <Card title="Your earnings">
        {earnings.length === 0 ? (
          <Empty>Nothing earned yet. You earn the New Shop Bonus when a shop you registered pays and gets going.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {earnings.map((e, i) => (
              <li key={e._id || i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{TYPE_LABEL[e.type] || e.type}</p>
                  <p className="truncate text-xs text-gray-500">
                    {[e.businessName || e.note, e.type === 'renewal' && e.ratePercent ? `${e.ratePercent}% of ${formatMoney(e.paymentAmount)}` : ''].filter(Boolean).join(' · ') || ' '}
                  </p>
                  <p className="text-[11px] text-gray-400">{formatDateTime(e.earnedAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`tabular text-sm font-semibold ${e.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatMoney(e.amount)}</p>
                  <div className="mt-1">
                    <Badge tone={e.status === 'paid' ? 'green' : 'amber'}>{e.status === 'paid' ? `Paid${e.paidAt ? ` ${formatDate(e.paidAt)}` : ''}` : e.onHold ? `Payable ${formatDate(e.payableOn)}` : 'Waiting to be paid'}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Payments sent to you">
        {payouts.length === 0 ? (
          <Empty>No payments have been sent to you yet.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {payouts.map((p, i) => (
              <li key={p._id || i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(p.createdAt)}</p>
                  {p.note && <p className="truncate text-xs text-gray-500">{p.note}</p>}
                </div>
                <p className="tabular shrink-0 text-sm font-semibold text-gray-900">{formatMoney(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
        <Note>
          Payment is by bank transfer to the account you gave the Programme Desk. Weekly Bonuses are paid on Fridays; a New Shop Bonus on the first Friday after it is {rules.holdDays} days old; renewals and milestones by the 5th of the next month.
        </Note>
      </Card>
    </div>
  );
}

export default function AgentMoneyPage() {
  const { data } = useAgent();
  return (
    <>
      <PageTitle title="Money" subtitle="What you have earned, what is waiting, and what was paid to you." />
      <MoneyTab data={data} />
    </>
  );
}
