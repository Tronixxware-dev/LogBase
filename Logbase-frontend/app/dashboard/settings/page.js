'use client';

import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { SettingsCard } from '@/components/SettingsParts';
import { useAlerts } from '@/lib/alerts';
import { hasFeature, businessTypeOf } from '@/lib/businessTypes';
import { anyPolicyOn } from '@/lib/settings';

function Group({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

// The hub: one card for each place you can change how LogBase works for your business.
export default function SettingsPage() {
  const { user, isOwner, settings } = useUser();
  const { pendingApprovals } = useAlerts();
  const stores = hasFeature(businessTypeOf(user), 'products');
  const rulesOn = anyPolicyOn(settings.approvalPolicies);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Settings" subtitle={isOwner ? 'Set up your business, your team and how LogBase works for you.' : 'Your profile and the alerts you want.'} />

      <Group title="Account">
        <SettingsCard href="/dashboard/profile" icon="user" tone="sky" title="Profile" description="Your name, phone number, photo and password." />
        <SettingsCard href="/dashboard/settings/notifications" icon="bell" tone="amber" title="Notification preferences" description="Choose which alerts you get, and whether to get some by email." />
        {!isOwner && rulesOn && (
          <SettingsCard href="/dashboard/approvals" icon="approve" tone="violet" title="My requests" description="Sales, returns and stock changes waiting for the administrator's OK." badge={pendingApprovals} />
        )}
      </Group>

      {isOwner && (
        <>
          <Group title="Business">
            <SettingsCard href="/dashboard/settings/organization" icon="building" tone="teal" title="Organization" description="Business name, logo, address and what is printed on receipts." />
            <SettingsCard href="/dashboard/settings/preferences" icon="sliders" tone="green" title="Business preferences" description="The usual payment method, low-stock level and laundry express charge." />
            {stores && <SettingsCard href="/dashboard/stores" icon="store" tone="rose" title="Stores" description="Add stores, and choose which one stock is sold from." />}
          </Group>

          <Group title="Team and control">
            <SettingsCard href="/dashboard/staffs" icon="team" tone="sky" title="Staffs & roles" description="Invite your team and choose what each person may do." />
            <SettingsCard href="/dashboard/settings/approvals" icon="shield" tone="violet" title="Approval policies" description="Make big discounts, credit sales, returns and stock changes wait for your OK." />
            <SettingsCard href="/dashboard/approvals" icon="approve" tone="amber" title="Approvals" description="Requests from your team that are waiting for an answer." badge={pendingApprovals} />
          </Group>

          <Group title="Data and billing">
            <SettingsCard href="/dashboard/data" icon="data" tone="teal" title="Import & export" description="Bring in your products and customers, or download your records." />
            <SettingsCard href="/dashboard/billing" icon="billing" tone="green" title="Billing" description="Your plan, payments and renewal." />
            <SettingsCard href="/dashboard/activity" icon="activity" tone="rose" title="Activity" description="Who did what in your business, and when." />
          </Group>
        </>
      )}
    </div>
  );
}
