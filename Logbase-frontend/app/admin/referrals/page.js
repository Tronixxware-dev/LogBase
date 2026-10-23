'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Badge, EmptyState, ErrorBanner, Field, ListTotal, LoadingState, inputClass, primaryButtonClass } from '@/components/ui';
import { adminCreateReferrer, adminReferrers } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { Panel, StatCard, useLoad } from '@/components/admin/ui';
import CopyButton from '@/components/admin/CopyButton';
import PersonPicker from '@/components/admin/PersonPicker';
import { signupLink } from '@/lib/referrals';

const EMPTY = { name: '', phone: '', email: '', code: '', ratePercent: '50', notes: '' };

export default function AdminReferralsPage() {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const { data, error, loading, reload } = useLoad(() => adminReferrers({ search: typed.trim() }), [typed]);
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
      const result = await adminCreateReferrer({ ...form, userId: picked ? picked._id : undefined, ratePercent: form.ratePercent === '' ? undefined : Number(form.ratePercent) });
      setMade(result.referrer);
      setForm(EMPTY);
      setPicked(null);
      setOpen(false);
      notifySuccess('Referral code made', `${result.referrer.name}: ${result.referrer.code}`);
      reload({ quiet: true });
    } catch (err) {
      setProblem(err.message || 'The code could not be made');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Referrer',
      render: (r) => (
        <span>
          <span className="font-medium text-gray-900">{r.name}</span>
          {(r.phone || r.email) && <span className="block text-xs text-gray-500">{[r.phone, r.email].filter(Boolean).join(' · ')}</span>}
        </span>
      ),
    },
    { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-sm font-semibold tracking-wider">{r.code}</span> },
    { key: 'ratePercent', label: 'Share', align: 'right', render: (r) => `${r.ratePercent}%` },
    { key: 'referred', label: 'Referred', align: 'right' },
    { key: 'paying', label: 'Paying', align: 'right' },
    { key: 'owed', label: 'Owed now', align: 'right', render: (r) => <span className={r.owed > 0 ? 'font-semibold text-amber-700' : ''}>{formatMoney(r.owed)}</span> },
    { key: 'paid', label: 'Paid out', align: 'right', render: (r) => formatMoney(r.paid) },
    { key: 'linked', label: 'Login linked', render: (r) => <Badge tone={r.linked ? 'green' : 'gray'}>{r.linked ? 'Linked' : 'Not linked'}</Badge> },
    { key: 'isActive', label: 'Status', render: (r) => <Badge tone={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Active' : 'Switched off'}</Badge> },
  ];

  return (
    <>
      <PageHeader
        title="Referrals"
        subtitle="Give a code to anyone who wants to refer businesses. They earn a share of every plan payment those businesses make."
        action={
          <button type="button" onClick={() => setOpen((v) => !v)} className={primaryButtonClass}>
            {open ? 'Cancel' : '+ New referral code'}
          </button>
        }
      />

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Referrers" value={data.summary.referrers} />
          <StatCard label="Businesses referred" value={data.summary.referred} />
          <StatCard label="Owed now" value={formatMoney(data.summary.owed)} sub="earned, not paid out yet" tone={data.summary.owed > 0 ? 'amber' : 'gray'} />
          <StatCard label="Paid out" value={formatMoney(data.summary.paid)} tone="green" />
        </div>
      )}

      {made && (
        <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
          <p className="text-sm font-semibold text-teal-900">Code made for {made.name}</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-teal-900">{made.code}</p>
          <p className="mt-2 break-all text-sm text-teal-800">{signupLink(made.code)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={made.code}>Copy code</CopyButton>
            <CopyButton text={signupLink(made.code)}>Copy sign-up link</CopyButton>
            <button type="button" onClick={() => router.push(`/admin/referrals/${made._id}`)} className="text-sm font-medium text-teal-800 underline">
              Open {made.name}
            </button>
          </div>
        </div>
      )}

      {open && (
        <Panel title="New referral code" className="mb-6">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <PersonPicker
              picked={picked}
              onPick={(p) => {
                setPicked(p);
                setForm((f) => ({ ...f, name: p.name || f.name, phone: p.phone || f.phone, email: p.email || f.email }));
              }}
              onClear={() => {
                setPicked(null);
                setForm((f) => ({ ...f, name: '', phone: '', email: '' }));
              }}
            />
            <Field label="Referrer's name">
              <input value={form.name} onChange={set('name')} required maxLength={80} className={inputClass} placeholder="e.g. Tunde Adeyemi" />
            </Field>
            <Field label="Phone (optional)">
              <input value={form.phone} onChange={set('phone')} maxLength={30} className={inputClass} placeholder="0803 000 0000" />
            </Field>
            <Field label="Email (optional)" hint="If they sign up themselves with this email, their own code is refused.">
              <input type="email" value={form.email} onChange={set('email')} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Share of each payment (%)" hint="They earn this share of every plan payment. 50 unless you change it.">
              <input type="number" min="1" max="100" value={form.ratePercent} onChange={set('ratePercent')} className={inputClass} />
            </Field>
            <Field label="Code (optional)" hint="Leave empty and a code is made for you. Letters and numbers only.">
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20) }))} className={`${inputClass} font-mono uppercase`} placeholder="Made for you" />
            </Field>
            <Field label="Note (optional)">
              <input value={form.notes} onChange={set('notes')} maxLength={300} className={inputClass} placeholder="e.g. Agent for Ikeja" />
            </Field>
            <div className="sm:col-span-2">
              <ErrorBanner message={problem} />
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                {saving ? 'Making the code…' : 'Make the code'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div className="mb-5">
        <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search by name, phone, email or code" className={inputClass} />
      </div>

      <ErrorBanner message={error} />
      {loading && !data ? (
        <LoadingState />
      ) : data && data.items.length === 0 ? (
        <EmptyState message={typed ? 'No referrer matches that.' : 'No referral codes yet. Make the first one.'} icon="tag" />
      ) : data ? (
        <>
          <ListTotal count={data.items.length} noun="referrer" />
          <DataTable columns={columns} rows={data.items} numbered={false} onRowClick={(r) => router.push(`/admin/referrals/${r._id}`)} />
        </>
      ) : null}
    </>
  );
}
