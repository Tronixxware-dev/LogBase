'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, EmptyState, ErrorBanner, Field, ListTotal, LoadingState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { adminAgents, adminCreateAgent } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { Panel, StatCard, useLoad } from '@/components/admin/ui';
import CopyButton from '@/components/admin/CopyButton';
import PersonPicker from '@/components/admin/PersonPicker';
import { signupLink } from '@/lib/referrals';

const EMPTY = { name: '', phone: '', email: '', code: '', rank: 'agent', notes: '' };
const RANKS = [
  { value: 'agent', label: 'Sales Agent (10% of renewals)' },
  { value: 'senior', label: 'Senior Sales Agent (12%)' },
  { value: 'lead', label: 'Team Lead (15%)' },
];

// The LogBase super admin's list of Sales Agents (the field people paid by the plan in the Sales Agent handbook).
export default function AdminAgentsPage() {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const { data, error, loading, reload } = useLoad(() => adminAgents({ search: typed.trim() }), [typed]);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const [made, setMade] = useState(null);
  const [picked, setPicked] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setProblem('');
    setSaving(true);
    try {
      const result = await adminCreateAgent({ ...form, userId: picked ? picked._id : undefined });
      setMade({ ...result.agent, invite: result.invite || null });
      setForm(EMPTY);
      setPicked(null);
      setOpen(false);
      notifySuccess('Sales Agent added', `${result.agent.name}: ${result.agent.agentNo} · code ${result.agent.code}`);
      reload({ quiet: true });
    } catch (err) {
      setProblem(err.message || 'The Sales Agent could not be added');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Sales Agent',
      render: (a) => (
        <span>
          <span className="font-medium text-gray-900">{a.name}</span>
          <span className="block text-xs text-gray-500">{[a.agentNo, a.phone, a.email].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    { key: 'rankName', label: 'Rank' },
    { key: 'code', label: 'Code', render: (a) => <span className="font-mono text-sm font-semibold tracking-wider">{a.code}</span> },
    { key: 'referred', label: 'Registered', align: 'right' },
    { key: 'activated', label: 'Activated', align: 'right' },
    { key: 'owed', label: 'Owed now', align: 'right', render: (a) => <span className={a.owed > 0 ? 'font-semibold text-amber-700' : ''}>{formatMoney(a.owed)}</span> },
    { key: 'paid', label: 'Paid out', align: 'right', render: (a) => formatMoney(a.paid) },
    {
      key: 'linked',
      label: 'Login',
      render: (a) =>
        a.linked ? (
          <Badge tone="green">Active</Badge>
        ) : a.inviteStatus === 'invited' ? (
          <Badge tone="amber">Invited</Badge>
        ) : a.inviteStatus === 'expired' ? (
          <Badge tone="red">Link expired</Badge>
        ) : (
          <Badge tone="gray">No login yet</Badge>
        ),
    },
    { key: 'isActive', label: 'Status', render: (a) => <Badge tone={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'Active' : 'Switched off'}</Badge> },
  ];

  return (
    <>
      <PageHeader
        title="Sales agents"
        subtitle="The field team. Each agent gets an ID number and a referral code, and is paid by the Sales Agent plan: New Shop Bonus, renewals, weekly and monthly bonuses."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/agents/weekly" className={secondaryButtonClass}>
              Weekly bonus check
            </Link>
            <button type="button" onClick={() => setOpen((v) => !v)} className={primaryButtonClass}>
              {open ? 'Cancel' : '+ New Sales Agent'}
            </button>
          </div>
        }
      />

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Active agents" value={data.summary.agents} />
          <StatCard label="Shops registered" value={data.summary.referred} sub={`${data.summary.activated} activated`} />
          <StatCard label="Owed now" value={formatMoney(data.summary.owed)} sub="earned, not paid out yet" tone={data.summary.owed > 0 ? 'amber' : 'gray'} />
          <StatCard label="Paid out" value={formatMoney(data.summary.paid)} tone="green" />
        </div>
      )}

      {made && (
        <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
          <p className="text-sm font-semibold text-teal-900">
            {made.name} added · ID {made.agentNo}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-teal-900">{made.code}</p>
          <p className="mt-2 break-all text-sm text-teal-800">{signupLink(made.code)}</p>
          {made.invite && (
            <p className="mt-3 text-sm text-teal-900">
              {made.invite.sent ? `The acceptance email was sent to ${made.email}. They choose their password from the link in it.` : `The email could not be sent${made.invite.reason ? ` (${made.invite.reason})` : ''}. Send them this link yourself:`}
            </p>
          )}
          {made.invite && !made.invite.sent && made.invite.link && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-xs text-teal-900">{made.invite.link}</span>
              <CopyButton text={made.invite.link}>Copy link</CopyButton>
            </div>
          )}
          <p className="mt-2 text-xs text-teal-800">Write the ID number and code on their ID card.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={made.code}>Copy code</CopyButton>
            <CopyButton text={signupLink(made.code)}>Copy sign-up link</CopyButton>
            <button type="button" onClick={() => router.push(`/admin/agents/${made._id}`)} className="text-sm font-medium text-teal-800 underline">
              Open {made.name}
            </button>
          </div>
        </div>
      )}

      {open && (
        <Panel title="New Sales Agent" className="mb-6">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <PersonPicker
              picked={picked}
              hint="If the agent already has a LogBase account, pick it here: it is linked, and they see their Sales agent dashboard in their menu. Or leave this and type their details in; you can link the account later."
              onPick={(p) => {
                setPicked(p);
                setForm((f) => ({ ...f, name: p.name || f.name, phone: p.phone || f.phone, email: p.email || f.email }));
              }}
              onClear={() => {
                setPicked(null);
                setForm((f) => ({ ...f, name: '', phone: '', email: '' }));
              }}
            />
            <Field label="Full name">
              <input value={form.name} onChange={set('name')} required maxLength={80} className={inputClass} placeholder="e.g. Ada Obi" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')} maxLength={30} className={inputClass} placeholder="0803 000 0000" />
            </Field>
            <Field label="Email" hint={picked ? 'Their account is linked, so no email is sent.' : 'The "your application was accepted" email goes here, with a link where they choose their own password.'}>
              <input type="email" value={form.email} onChange={set('email')} required={!picked} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Rank" hint="Everyone starts as a Sales Agent. The share applies to renewal payments from now on.">
              <select value={form.rank} onChange={set('rank')} className={inputClass}>
                {RANKS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Code (optional)" hint="Leave empty and a code is made for you. Letters and numbers only.">
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20) }))} className={`${inputClass} font-mono uppercase`} placeholder="Made for you" />
            </Field>
            <Field label="Note (optional)">
              <input value={form.notes} onChange={set('notes')} maxLength={300} className={inputClass} placeholder="e.g. Ikeja, Computer Village side" />
            </Field>
            <div className="sm:col-span-2">
              <ErrorBanner message={problem} />
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                {saving ? 'Adding…' : 'Add the Sales Agent'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div className="mb-5">
        <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search by name, ID number, phone, email or code" className={inputClass} />
      </div>

      <ErrorBanner message={error} />
      {loading && !data ? (
        <LoadingState />
      ) : data && data.items.length === 0 ? (
        <EmptyState message={typed ? 'No Sales Agent matches that.' : 'No Sales Agents yet. Add the first one.'} icon="tag" />
      ) : data ? (
        <>
          <ListTotal count={data.items.length} noun="Sales Agent" />
          <DataTable columns={columns} rows={data.items} numbered={false} onRowClick={(a) => router.push(`/admin/agents/${a._id}`)} />
        </>
      ) : null}
    </>
  );
}
