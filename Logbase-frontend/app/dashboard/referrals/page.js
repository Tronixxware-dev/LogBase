'use client';

import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, ErrorBanner, LoadingState } from '@/components/ui';
import { getMyReferrals } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { Panel, StatCard, useLoad } from '@/components/admin/ui';
import CopyButton from '@/components/admin/CopyButton';
import { signupLink } from '@/lib/referrals';

// A referrer's own page: their code, the businesses that signed up with it and what they earned.
// (The LogBase admin gives the code and links it to this account; the admin also sends the money.)
export default function MyReferralsPage() {
  const { data, error, loading } = useLoad(() => getMyReferrals(), []);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Referrals" />
        <LoadingState />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Referrals" />
        <ErrorBanner message={error || 'Could not load your referrals'} />
      </>
    );
  }
  if (!data.referrer) {
    return (
      <>
        <PageHeader title="Referrals" />
        <p className="text-sm text-gray-500">There is no referral code linked to your account.</p>
      </>
    );
  }

  const { referrer, referred, commissions, payouts } = data;
  const link = signupLink(referrer.code);

  const referredColumns = [
    { key: 'name', label: 'Business', render: (b) => <span className="font-medium text-gray-900">{b.name}</span> },
    { key: 'signedUpAt', label: 'Signed up', render: (b) => formatDate(b.signedUpAt) },
    { key: 'plan', label: 'Plan now', render: (b) => <Badge tone={b.plan === 'Free trial' || b.plan === 'Expired' ? 'gray' : 'green'}>{b.plan}</Badge> },
    { key: 'earned', label: 'You earned', align: 'right', render: (b) => formatMoney(b.earned) },
  ];
  const earningColumns = [
    { key: 'earnedAt', label: 'Date', render: (c) => formatDateTime(c.earnedAt) },
    { key: 'businessName', label: 'Business' },
    { key: 'plan', label: 'Plan', render: (c) => `${c.plan || '—'}${c.interval ? ` (${c.interval})` : ''}` },
    { key: 'paymentAmount', label: 'They paid', align: 'right', render: (c) => formatMoney(c.paymentAmount) },
    { key: 'ratePercent', label: 'Your share', align: 'right', render: (c) => `${c.ratePercent}%` },
    { key: 'amount', label: 'You earned', align: 'right', render: (c) => <span className="font-medium">{formatMoney(c.amount)}</span> },
    { key: 'status', label: 'Status', render: (c) => <Badge tone={c.status === 'paid' ? 'green' : 'amber'}>{c.status === 'paid' ? `Paid ${c.paidAt ? formatDate(c.paidAt) : ''}` : 'Waiting to be paid'}</Badge> },
  ];
  const payoutColumns = [
    { key: 'createdAt', label: 'Date', render: (p) => formatDateTime(p.createdAt) },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => <span className="font-medium">{formatMoney(p.amount)}</span> },
    { key: 'note', label: 'Note' },
  ];

  return (
    <>
      <PageHeader title="Referrals" subtitle={`You earn ${referrer.ratePercent}% of every plan payment made by the businesses you refer.`} />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Your referral code</p>
          <Badge tone={referrer.isActive ? 'green' : 'gray'}>{referrer.isActive ? 'Active' : 'Switched off'}</Badge>
        </div>
        <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-gray-900">{referrer.code}</p>
        <p className="mt-2 break-all text-sm text-gray-500">{link}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={referrer.code}>Copy code</CopyButton>
          <CopyButton text={link}>Copy sign-up link</CopyButton>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {referrer.isActive
            ? 'Share the link, or ask the business to type the code when it signs up.'
            : 'New businesses can no longer sign up with this code. The ones you already referred keep earning for you.'}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="People referred" value={referrer.referred} sub="businesses signed up" />
        <StatCard label="Paying" value={referrer.paying} sub="have paid for a plan" />
        <StatCard label="Total earned" value={formatMoney(referrer.earned)} sub={`from ${referrer.payments} payment${referrer.payments === 1 ? '' : 's'}`} />
        <StatCard label="Waiting to be paid" value={formatMoney(referrer.owed)} sub={`${formatMoney(referrer.paid)} already paid to you`} tone={referrer.owed > 0 ? 'amber' : 'gray'} />
      </div>

      <Panel title="Businesses you referred" className="mb-6">
        {referred.length === 0 ? (
          <p className="text-sm text-gray-500">Nobody has signed up with your code yet.</p>
        ) : (
          <DataTable columns={referredColumns} rows={referred} numbered={false} />
        )}
      </Panel>

      <Panel title="Your earnings" className="mb-6">
        {commissions.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing earned yet. You earn each time a business you referred pays for a plan.</p>
        ) : (
          <DataTable columns={earningColumns} rows={commissions} numbered={false} />
        )}
      </Panel>

      <Panel title="Payments sent to you">
        {payouts.length === 0 ? <p className="text-sm text-gray-500">No payments have been sent to you yet.</p> : <DataTable columns={payoutColumns} rows={payouts} numbered={false} />}
      </Panel>
    </>
  );
}
