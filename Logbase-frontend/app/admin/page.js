'use client';

import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { ErrorBanner, LoadingState, secondaryButtonClass } from '@/components/ui';
import { BarList, SegmentBar } from '@/components/charts';
import { Icon } from '@/components/Icons';
import { adminOverview } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/format';
import { ColumnChart, Panel, StatCard, StateBadge, compactMoney, endsText, useLoad } from '@/components/admin/ui';

const dayLabel = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const monthLabel = (month) => new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'short' });

export default function AdminOverviewPage() {
  const { data, error, loading, reload } = useLoad(adminOverview, []);

  const refresh = (
    <button type="button" onClick={() => reload()} className={secondaryButtonClass}>
      Refresh
    </button>
  );

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Overview" subtitle="Everything happening across LogBase." />
        <LoadingState />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Overview" subtitle="Everything happening across LogBase." />
        <ErrorBanner message={error || 'Could not load the overview'} />
      </>
    );
  }

  const { totals, states, byPlan, revenue } = data;
  const alerts = [];
  if (data.flaggedPayments > 0) alerts.push({ tone: 'red', text: `${data.flaggedPayments} payment${data.flaggedPayments === 1 ? '' : 's'} flagged (amount did not match)`, href: '/admin/payments' });
  if (data.failedRenewals.length > 0) alerts.push({ tone: 'amber', text: `${data.failedRenewals.length} automatic renewal${data.failedRenewals.length === 1 ? '' : 's'} failing`, href: null });
  if (data.trialsEnding.length > 0) alerts.push({ tone: 'amber', text: `${data.trialsEnding.length} trial${data.trialsEnding.length === 1 ? '' : 's'} ending within 3 days`, href: null });

  return (
    <>
      <PageHeader title="Overview" subtitle={`Everything happening across LogBase. Updated ${new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`} action={refresh} />
      <ErrorBanner message={error} />

      {alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {alerts.map((a) => {
            const cls = `inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${a.tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`;
            return a.href ? (
              <Link key={a.text} href={a.href} className={cls}>
                <Icon name="alert" className="h-4 w-4" />
                {a.text}
              </Link>
            ) : (
              <span key={a.text} className={cls}>
                <Icon name="alert" className="h-4 w-4" />
                {a.text}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Businesses" value={totals.businesses.toLocaleString()} sub={`${totals.newThisMonth} new in 30 days`} />
        <StatCard label="Paying now" value={states.active.toLocaleString()} sub={`≈ ${formatMoney(data.mrr)} a month`} tone="green" />
        <StatCard label="On free trial" value={states.trialing.toLocaleString()} sub={`${states.trial_ended + states.expired} ended or expired`} />
        <StatCard label="Revenue this month" value={formatMoney(revenue.thisMonth)} sub={`${formatMoney(revenue.total)} all time`} />
        <StatCard label="People with logins" value={totals.users.toLocaleString()} />
        <StatCard label="Active this week" value={totals.activeThisWeek.toLocaleString()} sub="businesses that did something" />
        <StatCard label="Sales, last 30 days" value={data.sales30.count.toLocaleString()} sub={`${formatMoney(data.sales30.total)} sold through LogBase`} />
        <StatCard label="Products stored" value={totals.products.toLocaleString()} sub={`${totals.sales.toLocaleString()} sales recorded in total`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="New businesses, last 30 days">
          <ColumnChart data={data.signups} valueKey="count" labelKey="day" labelFormat={dayLabel} format={(n) => `${n} new`} height={130} />
        </Panel>
        <Panel title="Money paid for plans, last 6 months">
          <ColumnChart data={revenue.byMonth} valueKey="amount" labelKey="month" labelFormat={monthLabel} format={(n) => formatMoney(n)} color="#eb6834" height={130} />
          <p className="mt-3 text-xs text-gray-500">Paid through Paystack. Plan time you give away here is not counted.</p>
        </Panel>
        <Panel title="Sales through LogBase, last 30 days">
          <ColumnChart data={data.salesByDay} valueKey="total" labelKey="day" labelFormat={dayLabel} format={(n) => formatMoney(n)} height={130} />
          <p className="mt-3 text-xs text-gray-500">Value of sales recorded by all businesses together, by day.</p>
        </Panel>
        <Panel title="Where businesses stand">
          <SegmentBar
            segments={[
              { label: 'Paid', value: states.active, color: '#16a34a', display: states.active },
              { label: 'On free trial', value: states.trialing, color: '#0d9488', display: states.trialing },
              { label: 'Trial ended (Free plan)', value: states.trial_ended, color: '#94a3b8', display: states.trial_ended },
              { label: 'Paid plan expired (Free plan)', value: states.expired, color: '#d97706', display: states.expired },
            ]}
          />
          <p className="mt-3 text-xs text-gray-500">
            Paying: {byPlan.starter || 0} on Starter, {byPlan.business || 0} on Business.
            {states.suspended > 0 && ` ${states.suspended} suspended.`}
          </p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Busiest businesses, last 30 days">
          <BarList
            empty="No sales were recorded in the last 30 days."
            items={data.topBusinesses.map((b) => ({ label: b.name, value: b.total, display: compactMoney(b.total), sub: `${b.sales} sale${b.sales === 1 ? '' : 's'}` }))}
          />
        </Panel>

        <Panel title="Newest businesses" action={<Link href="/admin/businesses" className="text-sm font-medium text-primary">See all</Link>}>
          <ul className="divide-y divide-gray-100">
            {data.recentSignups.map((b) => (
              <li key={b._id}>
                <Link href={`/admin/businesses/${b._id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">{b.name}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {b.ownerName ? `${b.ownerName} · ` : ''}joined {formatDate(b.createdAt)}
                    </span>
                  </span>
                  <StateBadge state={b.state} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {data.trialsEnding.length > 0 && (
          <Panel title="Trials ending soon">
            <ul className="divide-y divide-gray-100">
              {data.trialsEnding.map((b) => (
                <li key={b._id}>
                  <Link href={`/admin/businesses/${b._id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate font-medium text-gray-900">{b.name}</span>
                    <span className="shrink-0 text-gray-500">{endsText(b)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {data.failedRenewals.length > 0 && (
          <Panel title="Automatic renewals that are failing">
            <ul className="divide-y divide-gray-100">
              {data.failedRenewals.map((b) => (
                <li key={b._id}>
                  <Link href={`/admin/businesses/${b._id}`} className="block py-2.5 text-sm">
                    <span className="font-medium text-gray-900">{b.name}</span>
                    <span className="ml-2 text-gray-500">
                      failed {b.attempts} time{b.attempts === 1 ? '' : 's'}
                    </span>
                    {b.reason && <span className="block truncate text-xs text-gray-400">{b.reason}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
