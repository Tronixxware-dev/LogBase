'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, EmptyState, ErrorBanner, Field, LoadingState, inputClass, primaryButtonClass } from '@/components/ui';
import { adminAgentsWeekly, adminCreditWeekly } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { Panel, useLoad } from '@/components/admin/ui';

// Checks one finished week for every active Sales Agent and credits the Weekly Activity Bonus to the ones you tick among
// those who reached all three targets. Visits and demos are what the agents wrote up themselves, so look before you credit.
// Registrations are counted from the businesses that signed up with the agent's code AND have at least one product
// (a sign-up with nothing in it is shown but does not count).
export default function AdminAgentsWeeklyPage() {
  const [week, setWeek] = useState('');
  const { data, error, loading, reload } = useLoad(() => adminAgentsWeekly(week || undefined), [week]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  // agents who reached the targets but were unticked by the admin (everyone who qualifies starts ticked)
  // (kept together with the week it belongs to, so choosing another week starts again with everyone ticked)
  const [unticks, setUnticks] = useState({ week: '', ids: [] });
  const monday = data ? data.monday : '';
  const unticked = new Set(unticks.week === monday ? unticks.ids : []);
  const setUnticked = (update) => setUnticks({ week: monday, ids: Array.from(update(unticked)) });

  async function credit() {
    setProblem('');
    setBusy(true);
    try {
      const ids = data.items.filter((r) => r.qualifies && !r.credited && !unticked.has(r._id)).map((r) => r._id);
      const result = await adminCreditWeekly(data.monday, ids);
      notifySuccess('Weekly bonus credited', `${result.credited} Sales Agent${result.credited === 1 ? '' : 's'} credited for the week of ${formatDate(result.monday)}`);
      await reload({ quiet: true });
    } catch (err) {
      setProblem(err.message || 'Could not credit the week');
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Sales Agent',
      render: (r) => (
        <span>
          <span className="font-medium text-gray-900">{r.name}</span>
          <span className="block text-xs text-gray-500">{r.agentNo}</span>
        </span>
      ),
    },
    { key: 'visits', label: `Visits (${data ? data.targets.visits : 40})`, align: 'right', render: (r) => <span className={data && r.visits >= data.targets.visits ? 'font-semibold text-emerald-700' : ''}>{r.visits}</span> },
    { key: 'demos', label: `Demos (${data ? data.targets.demos : 15})`, align: 'right', render: (r) => <span className={data && r.demos >= data.targets.demos ? 'font-semibold text-emerald-700' : ''}>{r.demos}</span> },
    { key: 'registrations', label: `Registered (${data ? data.targets.registrations : 8})`, align: 'right', render: (r) => (
        <span className={data && r.registrations >= data.targets.registrations ? 'font-semibold text-emerald-700' : ''}>
          {r.registrations}
          {r.signups > r.registrations && <span className="block text-xs font-normal text-gray-400">{r.signups} signed up, {r.signups - r.registrations} with no product</span>}
        </span>
      ),
    },
    { key: 'days', label: 'Days written up', align: 'right' },
    {
      key: 'pick',
      label: 'Credit?',
      render: (r) =>
        r.qualifies && !r.credited ? (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!unticked.has(r._id)}
              onChange={(e) =>
                setUnticked((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.delete(r._id);
                  else next.add(r._id);
                  return next;
                })
              }
              className="h-4 w-4 rounded border-gray-300"
              aria-label={`Credit ${r.name}`}
            />
            Credit
          </label>
        ) : (
          '—'
        ),
    },
    { key: 'qualifies', label: 'Result', render: (r) => <Badge tone={r.credited ? 'green' : r.qualifies ? 'teal' : 'gray'}>{r.credited ? 'Credited' : r.qualifies ? 'Reached all three' : 'Not reached'}</Badge> },
  ];

  const waiting = data ? data.items.filter((r) => r.qualifies && !r.credited && !unticked.has(r._id)).length : 0;

  return (
    <>
      <PageHeader title="Weekly bonus check" subtitle="Monday to Sunday. Credit the bonus after the week is over; the agent is then paid on Friday." backHref="/admin/agents" backLabel="All Sales Agents" />

      <Panel className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <Field label="Week" hint="Pick any day of the week. Empty shows the last finished week.">
            <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className={inputClass} />
          </Field>
          <div className="sm:col-span-2 sm:text-right">
            {data && (
              <p className="mb-2 text-sm text-gray-600">
                Week of <span className="font-semibold text-gray-900">{formatDate(data.monday)}</span> · bonus {formatMoney(data.bonus)} each
              </p>
            )}
            <button type="button" disabled={busy || !data || !data.over || waiting === 0} onClick={credit} className={primaryButtonClass}>
              {busy ? 'Crediting…' : waiting > 0 ? `Credit ${waiting} ticked Sales Agent${waiting === 1 ? '' : 's'}` : 'Nobody ticked'}
            </button>
            {data && !data.over && <p className="mt-2 text-xs text-amber-700">This week is not over yet.</p>}
          </div>
        </div>
        <ErrorBanner message={problem} />
      </Panel>

      <ErrorBanner message={error} />
      {loading && !data ? (
        <LoadingState />
      ) : data && data.items.length === 0 ? (
        <EmptyState message="There are no active Sales Agents." icon="tag" />
      ) : data ? (
        <DataTable columns={columns} rows={data.items} numbered={false} />
      ) : null}
    </>
  );
}
