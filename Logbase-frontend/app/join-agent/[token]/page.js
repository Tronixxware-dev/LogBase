'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { acceptAgentInvite, getAgentInvite, setToken } from '@/lib/api';
import AuthShell, { AuthButton, AuthError, AuthField } from '@/components/AuthShell';
import { LogoLoader } from '@/components/LogoLoader';

// Where a Sales Agent lands from the "your application was accepted" email.
// They choose a password and are signed in to their own Sales Agent pages (no business, no orders).
export default function JoinAgentPage() {
  const { token } = useParams();
  const router = useRouter();
  const [invite, setInvite] = useState(null);
  const [gone, setGone] = useState('');
  const [form, setForm] = useState({ password: '', again: '', phone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState('');

  useEffect(() => {
    let cancelled = false;
    getAgentInvite(token)
      .then((data) => {
        if (cancelled) return;
        setInvite(data);
        setForm((f) => ({ ...f, phone: data.phone || '' }));
      })
      .catch((err) => {
        if (!cancelled) setGone(err.offline ? err.message : err.message || 'This link does not work.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.again) {
      setError('The two passwords are not the same.');
      return;
    }
    setSaving(true);
    try {
      const data = await acceptAgentInvite(token, { password: form.password, phone: form.phone });
      if (data.existing) {
        setExisting(data.message || 'You already have a LogBase account with this email. Log in with it.');
        return;
      }
      setToken(data.token);
      router.replace('/agent');
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!invite && !gone) return <LogoLoader fullscreen label="Opening your invitation…" />;

  if (gone) {
    return (
      <AuthShell title="This link no longer works" subtitle="Sign-up links are for one person and last 7 days.">
        <p className="mb-4 text-sm text-gray-600">{gone}</p>
        <p className="text-sm text-gray-600">
          Already set your password? <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>. Otherwise write to{' '}
          <a href="mailto:support@mylogbase.com" className="font-medium text-primary hover:underline">support@mylogbase.com</a> and the Programme Desk will send you a new link.
        </p>
      </AuthShell>
    );
  }

  if (existing) {
    return (
      <AuthShell title="You are already on LogBase" subtitle={invite.email}>
        <p className="mb-5 text-sm text-gray-600">{existing}</p>
        <Link href="/login" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white hover:opacity-90">
          Go to log in
        </Link>
      </AuthShell>
    );
  }

  const first = (invite.name || '').trim().split(/\s+/)[0] || 'there';

  return (
    <AuthShell
      title={`Welcome, ${first}. You are in.`}
      subtitle="Your LogBase Sales Agent application was accepted. Choose a password to open your Sales Agent page."
      footer={
        <>
          Already have your password?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-5">
        <AuthField label="Your email (you log in with it)" icon="mail" type="email" value={invite.email} readOnly disabled />
        <AuthField
          label="Choose a password"
          icon="lock"
          type="password"
          name="password"
          value={form.password}
          onChange={change}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <AuthField
          label="Type it again"
          icon="lock"
          type="password"
          name="again"
          value={form.again}
          onChange={change}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="The same password"
        />
        <AuthField label="Phone number (optional)" icon="phone" type="tel" name="phone" value={form.phone} onChange={change} autoComplete="tel" placeholder="0803 000 0000" />
        <AuthButton loading={saving} loadingText="Setting up…">
          Open my Sales Agent page
        </AuthButton>
      </form>
    </AuthShell>
  );
}
