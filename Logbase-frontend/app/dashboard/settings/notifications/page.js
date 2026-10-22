'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { SettingsSection, Toggle } from '@/components/SettingsParts';
import { ErrorBanner, LoadingState } from '@/components/ui';
import { getNotificationPrefs, saveNotificationPrefs } from '@/lib/api';

// Which alerts this person wants. Each switch saves straight away.
export default function NotificationPreferencesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    getNotificationPrefs()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  async function change(key, value) {
    setError('');
    setBusy(key);
    const before = data;
    setData({ ...data, prefs: { ...data.prefs, [key]: value } }); // shown at once
    try {
      setData(await saveNotificationPrefs({ [key]: value }));
    } catch (err) {
      setData(before);
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (!data && !error) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notification preferences" subtitle="Choose the alerts you want. They appear under the bell at the top of every page." backHref="/dashboard/settings" backLabel="Back to settings" />
      <ErrorBanner message={error} />
      {data && (
        <>
          <SettingsSection title="Alerts" icon="bell">
            <div className="divide-y divide-gray-100">
              {data.types.map((t) => (
                <Toggle key={t.key} label={t.label} hint={t.hint} checked={data.prefs[t.key] !== false} disabled={busy === t.key} onChange={(v) => change(t.key, v)} />
              ))}
            </div>
          </SettingsSection>
          <SettingsSection title="Email" description="The most important alerts can also reach your inbox." icon="mail">
            <Toggle
              label="Also send approval requests and low-stock alerts by email"
              hint="Sent to the email you sign in with. Only the alerts you switched on above are sent."
              checked={data.prefs.email === true}
              disabled={busy === 'email'}
              onChange={(v) => change('email', v)}
            />
          </SettingsSection>
        </>
      )}
    </div>
  );
}
