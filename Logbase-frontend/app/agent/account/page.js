'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { ErrorBanner, Field, inputClass, primaryButtonClass } from '@/components/ui';
import { Panel } from '@/components/admin/ui';
import { changePassword } from '@/lib/api';
import { notifySuccess } from '@/lib/feedback';
import { useUser } from '@/components/UserProvider';

// A Sales Agent's account: who they are, and a way to change their password.
export default function AgentAccountPage() {
  const { user, logout } = useUser();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    if (next !== again) {
      setProblem('The two new passwords are not the same.');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setAgain('');
      notifySuccess('Password changed', 'Use the new one the next time you log in.');
    } catch (err) {
      setProblem(err.message || 'The password could not be changed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle="Your sign-in details." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="You">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email (what you log in with)</dt>
              <dd className="break-all font-medium text-gray-900">{user.email}</dd>
            </div>
          </dl>
          <button type="button" onClick={logout} className="mt-5 text-sm font-medium text-gray-600 underline hover:text-gray-900">
            Log out
          </button>
        </Panel>

        <Panel title="Change your password">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Current password">
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={inputClass} />
            </Field>
            <Field label="New password" hint="At least 8 characters. Do not use your name or email in it.">
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
            </Field>
            <Field label="New password again">
              <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
            </Field>
            <ErrorBanner message={problem} />
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </Panel>
      </div>
    </>
  );
}
