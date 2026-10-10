'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, EmptyState, ErrorBanner, Field, LoadingState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import {
  adminBusiness,
  adminBusinessData,
  adminEndPlan,
  adminExtendTrial,
  adminGrantPlan,
  adminSendReset,
  adminSetSuspended,
  adminSetUserActive,
} from '@/lib/api';
import { notifySuccess } from '@/lib/feedback';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { Pager, Panel, PaymentBadge, StatCard, StateBadge, endsText, timeAgo, useLoad } from '@/components/admin/ui';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'records', label: 'Records' },
  { key: 'payments', label: 'Payments' },
  { key: 'activity', label: 'Activity' },
];

export default function AdminBusinessPage() {
  const { id } = useParams();
  const { data, setData, error, loading } = useLoad(() => adminBusiness(id), [id]);
  const [tab, setTab] = useState('overview');
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  // runs one change (suspend, extend trial...) and shows the business as it is afterwards
  async function run(label, task) {
    setProblem('');
    setNotice('');
    try {
      const result = await task();
      if (result && result.detail) setData(result.detail);
      notifySuccess(label, result && result.message ? result.message : '');
      setNotice((result && result.message) || label);
      return true;
    } catch (err) {
      setProblem(err.message || 'That did not work');
      return false;
    }
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Business" backHref="/admin/businesses" backLabel="All businesses" />
        <LoadingState />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Business" backHref="/admin/businesses" backLabel="All businesses" />
        <ErrorBanner message={error || 'Business not found'} />
      </>
    );
  }

  const { business, plan } = data;

  return (
    <>
      <PageHeader
        title={business.name}
        subtitle={[business.email, business.phone, `joined ${formatDate(business.createdAt)}`].filter(Boolean).join(' · ')}
        backHref="/admin/businesses"
        backLabel="All businesses"
        action={<StateBadge state={plan.state} />}
      />

      {!business.isActive && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This business is suspended{business.suspendedAt ? ` since ${formatDate(business.suspendedAt)}` : ''}. Nobody in it can log in.
          {business.suspendedReason && <span className="mt-1 block text-red-600">Reason: {business.suspendedReason}</span>}
        </div>
      )}
      <ErrorBanner message={problem} />
      {notice && !problem && (
        <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      <Actions business={business} plan={plan} run={run} id={id} />

      <div className="mb-5 mt-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab data={data} run={run} />}
      {tab === 'records' && <RecordsTab id={id} />}
      {tab === 'payments' && <PaymentsTab payments={data.payments} />}
      {tab === 'activity' && <ActivityTab data={data} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The things you can do to this business                              */
/* ------------------------------------------------------------------ */

function Actions({ business, plan, run, id }) {
  const [mode, setMode] = useState(null); // null | 'suspend' | 'trial' | 'grant' | 'end'
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [grant, setGrant] = useState({ plan: 'starter', interval: 'monthly', days: '30', note: '' });

  async function go(label, task) {
    setBusy(true);
    const ok = await run(label, task);
    setBusy(false);
    if (ok) {
      setMode(null);
      setReason('');
    }
  }

  const paidRunning = plan.planState === 'active';
  const button = (key, label, tone = 'normal') => (
    <button
      type="button"
      onClick={() => setMode(mode === key ? null : key)}
      className={`${secondaryButtonClass} ${mode === key ? 'ring-2 ring-primary/40' : ''} ${tone === 'danger' ? 'text-red-600' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <Panel title="Actions">
      <div className="flex flex-wrap gap-2">
        {business.isActive ? button('suspend', 'Suspend business', 'danger') : (
          <button
            type="button"
            disabled={busy}
            onClick={() => go('Business reactivated', () => adminSetSuspended(id, false))}
            className={primaryButtonClass}
          >
            Reactivate business
          </button>
        )}
        {!paidRunning && button('trial', 'Extend free trial')}
        {button('grant', 'Give a plan')}
        {plan.plan !== 'free' && button('end', 'Move to Free plan', 'danger')}
      </div>

      {mode === 'suspend' && (
        <form
          className="mt-4 max-w-lg space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            go('Business suspended', () => adminSetSuspended(id, true, reason));
          }}
        >
          <Field label="Reason (the owner sees this when they try to log in)">
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Payment dispute" className={inputClass} />
          </Field>
          <p className="text-xs text-gray-500">Nobody in this business can log in or use the app until you reactivate it. Their data is not deleted.</p>
          <button type="submit" disabled={busy} className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Suspending…' : 'Suspend now'}
          </button>
        </form>
      )}

      {mode === 'trial' && (
        <form
          className="mt-4 max-w-lg space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            go('Trial extended', () => adminExtendTrial(id, Number(days)));
          }}
        >
          <Field label="Days to add" hint="Added to the end of the trial (or counted from today if it already ended). They get every Business feature while it runs.">
            <input type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} className={inputClass} required />
          </Field>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map((n) => (
              <button key={n} type="button" onClick={() => setDays(String(n))} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
                {n} days
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? 'Saving…' : 'Extend trial'}
          </button>
        </form>
      )}

      {mode === 'grant' && (
        <form
          className="mt-4 max-w-lg space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            go('Plan given', () => adminGrantPlan(id, { ...grant, days: Number(grant.days) }));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Plan">
              <select value={grant.plan} onChange={(e) => setGrant({ ...grant, plan: e.target.value })} className={inputClass}>
                <option value="starter">Starter</option>
                <option value="business">Business</option>
              </select>
            </Field>
            <Field label="Billed">
              <select value={grant.interval} onChange={(e) => setGrant({ ...grant, interval: e.target.value })} className={inputClass}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
            <Field label="Days to give">
              <input type="number" min="1" max="730" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} className={inputClass} required />
            </Field>
          </div>
          <Field label="Note (only you see it)">
            <input value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} maxLength={200} placeholder="e.g. Paid by bank transfer, ref 12345" className={inputClass} />
          </Field>
          <p className="text-xs text-gray-500">
            This adds plan time without a Paystack payment (it is not counted as revenue). If they already have the same plan running, the days are added on the end.
          </p>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? 'Saving…' : 'Give the plan'}
          </button>
        </form>
      )}

      {mode === 'end' && (
        <div className="mt-4 max-w-lg space-y-3">
          <p className="text-sm text-gray-600">
            This moves {business.name} to the Free plan right now (50 stocks, no staff accounts) and switches automatic renewal off. Nothing is deleted, and you can give a plan again later.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => go('Moved to Free plan', () => adminEndPlan(id))}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Move to Free plan'}
          </button>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Overview tab: plan, numbers, people                                 */
/* ------------------------------------------------------------------ */

function Line({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{children}</dd>
    </div>
  );
}

function OverviewTab({ data, run }) {
  const { plan, stats, users } = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={stats.sales.toLocaleString()} sub={`${formatMoney(stats.salesTotal)} in total`} />
        <StatCard label="Products" value={stats.products.toLocaleString()} />
        <StatCard label="Customers" value={stats.customers.toLocaleString()} />
        <StatCard label="Last sale" value={stats.lastSale ? timeAgo(stats.lastSale) : 'none yet'} sub={stats.lastSale ? formatDate(stats.lastSale) : ''} />
        <StatCard label="Purchases" value={stats.purchases.toLocaleString()} sub={`${formatMoney(stats.purchasesTotal)} spent on stock`} />
        <StatCard label="Expenses" value={stats.expenses.toLocaleString()} sub={`${formatMoney(stats.expensesTotal)} in total`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Plan">
          <dl className="divide-y divide-gray-100">
            <Line label="Right now">
              <StateBadge state={plan.state} />
            </Line>
            <Line label="Plan">{plan.planName}</Line>
            {plan.planState === 'trialing' && <Line label="Trial ends">{formatDate(plan.trialEndsAt)} ({endsText(plan)})</Line>}
            {plan.planState === 'active' && (
              <>
                <Line label="Billed">{plan.interval}</Line>
                <Line label="Paid until">{formatDate(plan.currentPeriodEnd)} ({endsText(plan)})</Line>
                <Line label="Brings in">{formatMoney(plan.monthlyValue)} a month</Line>
              </>
            )}
            {(plan.planState === 'expired' || plan.planState === 'trial_ended') && (
              <Line label="History">
                {plan.planState === 'expired' ? `Was on ${plan.lastPaidPlan || 'a paid plan'}, ended ${formatDate(plan.currentPeriodEnd)}` : `Trial ended ${formatDate(plan.trialEndsAt)}`}
              </Line>
            )}
            <Line label="Last payment">{plan.lastPaymentAt ? formatDateTime(plan.lastPaymentAt) : 'none'}</Line>
            <Line label="Automatic renewal">{plan.autoRenew ? 'On' : 'Off'}</Line>
            {plan.card && (
              <Line label="Saved card">
                {plan.card.brand} •••• {plan.card.last4}
                {plan.card.expMonth && ` (${plan.card.expMonth}/${plan.card.expYear})`}
              </Line>
            )}
            {plan.renewalAttempts > 0 && (
              <Line label="Renewal problem">
                <span className="text-red-600">
                  Failed {plan.renewalAttempts} time{plan.renewalAttempts === 1 ? '' : 's'}
                  {plan.renewalFailure ? `: ${plan.renewalFailure}` : ''}
                </span>
              </Line>
            )}
          </dl>
        </Panel>

        <Panel title={`People (${users.length})`}>
          <ul className="divide-y divide-gray-100">
            {users.map((u) => (
              <PersonRow key={u._id} user={u} run={run} />
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function PersonRow({ user, run }) {
  const [busy, setBusy] = useState(false);

  async function act(label, task) {
    setBusy(true);
    await run(label, task);
    setBusy(false);
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-gray-900">
            {user.name}{' '}
            {user.role === 'owner' ? <Badge tone="teal" dot={false}>Owner</Badge> : <Badge tone="gray" dot={false}>{user.jobTitle || 'Staff'}</Badge>}{' '}
            {!user.isActive && <Badge tone="red" dot={false}>Switched off</Badge>}
          </span>
          <span className="block truncate text-xs text-gray-500">{user.email}</span>
        </span>
        <span className="flex gap-2">
          {user.isActive && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act('Reset link sent', () => adminSendReset(user._id))}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Email reset link
            </button>
          )}
          {!user.isSuperAdmin && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act(user.isActive ? 'Account switched off' : 'Account switched on', () => adminSetUserActive(user._id, !user.isActive))}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {user.isActive ? 'Switch off' : 'Switch on'}
            </button>
          )}
        </span>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Records tab: read-only look at what the business entered            */
/* ------------------------------------------------------------------ */

const KINDS = [
  { key: 'sales', label: 'Sales' },
  { key: 'products', label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'expenses', label: 'Expenses' },
];

const COLUMNS = {
  sales: [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'item', label: 'Item', render: (r) => `${r.item}${r.variant ? ` (${r.variant})` : ''}` },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'total', label: 'Total', align: 'right', render: (r) => formatMoney(r.total) },
    { key: 'paid', label: 'Paid', align: 'right', render: (r) => formatMoney(r.paid) },
    { key: 'status', label: 'Status' },
    { key: 'customer', label: 'Customer' },
    { key: 'seller', label: 'Sold by' },
  ],
  products: [
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'In stock', align: 'right' },
    { key: 'costPrice', label: 'Cost', align: 'right', render: (r) => formatMoney(r.costPrice) },
    { key: 'sellingPrice', label: 'Price', align: 'right', render: (r) => formatMoney(r.sellingPrice) },
  ],
  customers: [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'balance', label: 'Owes', align: 'right', render: (r) => formatMoney(r.balance) },
    { key: 'createdAt', label: 'Added', render: (r) => formatDate(r.createdAt) },
  ],
  purchases: [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'item', label: 'Item' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'totalCost', label: 'Cost', align: 'right', render: (r) => formatMoney(r.totalCost) },
    { key: 'supplier', label: 'Supplier' },
  ],
  expenses: [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount) },
    { key: 'description', label: 'Note' },
    { key: 'by', label: 'Entered by' },
  ],
};

function RecordsTab({ id }) {
  const [kind, setKind] = useState('sales');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(() => adminBusinessData(id, kind, page), [id, kind, page]);

  return (
    <>
      <p className="mb-3 text-xs text-gray-500">Read-only. This is exactly what the business has entered; nothing here can be changed from the admin panel.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => {
              setKind(k.key);
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${kind === k.key ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <ErrorBanner message={error} />
      {loading && !data ? (
        <LoadingState />
      ) : data && data.items.length === 0 ? (
        <EmptyState message={`No ${kind} yet.`} />
      ) : data ? (
        <>
          <p className="mb-3 text-sm text-gray-500">
            Total: <span className="tabular font-semibold text-gray-900">{data.total.toLocaleString()}</span>
          </p>
          <DataTable columns={COLUMNS[kind]} rows={data.items} numbered={false} />
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Payments and activity tabs                                          */
/* ------------------------------------------------------------------ */

function PaymentsTab({ payments }) {
  if (payments.length === 0) return <EmptyState message="This business has not paid for a plan yet." icon="billing" />;
  const columns = [
    { key: 'createdAt', label: 'Date', render: (p) => formatDateTime(p.paidAt || p.createdAt) },
    { key: 'plan', label: 'Plan', render: (p) => `${p.planName} (${p.interval})${p.renewal ? ' · auto-renewal' : ''}` },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => formatMoney(p.amount) },
    { key: 'status', label: 'Status', render: (p) => <PaymentBadge status={p.status} /> },
    { key: 'reference', label: 'Reference', render: (p) => <span className="break-all font-mono text-xs">{p.reference}</span> },
  ];
  return <DataTable columns={columns} rows={payments} numbered={false} />;
}

function ActivityTab({ data }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="What people in this business did (latest 15)">
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.recentActivity.map((a) => (
              <li key={a._id} className="py-2.5 text-sm">
                <p className="text-gray-900">{a.summary}</p>
                <p className="text-xs text-gray-500">
                  {a.userName || 'Someone'} · {formatDateTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="What you did to this business">
        {data.adminNotes.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.adminNotes.map((a) => (
              <li key={a._id} className="py-2.5 text-sm">
                <p className="text-gray-900">{a.summary}</p>
                <p className="text-xs text-gray-500">
                  {a.adminEmail} · {formatDateTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
