'use client';

import { useState } from 'react';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { SettingsSection, SavedNote } from '@/components/SettingsParts';
import { ErrorBanner, Field, inputClass, primaryButtonClass } from '@/components/ui';
import { savePreferences } from '@/lib/api';
import { businessTypeOf, hasFeature } from '@/lib/businessTypes';
import { PAYMENT_METHOD_OPTIONS } from '@/lib/settings';
import { notifySuccess } from '@/lib/feedback';

// How the business likes things set up. These choices are used as the starting point on the forms; a person can still change them for one sale.
export default function PreferencesPage() {
  const { user, settings, updateUser } = useUser();
  const p = settings.preferences;
  const type = businessTypeOf(user);
  const [method, setMethod] = useState(p.defaultPaymentMethod);
  const [level, setLevel] = useState(String(p.defaultReorderLevel));
  const [express, setExpress] = useState(String(p.expressPercent));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const payload = { defaultPaymentMethod: method, defaultReorderLevel: level === '' ? 0 : Number(level) };
    if (hasFeature(type, 'laundry')) {
      if (express === '' || !(Number(express) >= 0 && Number(express) <= 300)) return setError('The express charge must be between 0 and 300 percent');
      payload.expressPercent = Number(express);
    }
    if (!Number.isInteger(payload.defaultReorderLevel) || payload.defaultReorderLevel < 0) return setError('The low-stock level must be a whole number, 0 or more');
    setSaving(true);
    try {
      const data = await savePreferences(payload);
      updateUser({ settings: { ...user.settings, ...data.settings } });
      setSaved(true);
      notifySuccess('Preferences saved', 'New forms start with your choices');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const touch = (setter) => (e) => {
    setSaved(false);
    setter(e.target.value);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Business preferences" subtitle="Your usual choices. They are filled in for you, so your team types less." backHref="/dashboard/settings" backLabel="Back to settings" />
      <ErrorBanner message={error} />
      <form onSubmit={save}>
        {hasFeature(type, 'sales') || hasFeature(type, 'laundry') || hasFeature(type, 'repairs') ? (
          <SettingsSection title="Payments" icon="wallet">
            <Field label="Usual payment method" hint="Chosen for you when a sale is recorded. Staff can still pick another one.">
              <select value={method} onChange={touch(setMethod)} className={inputClass}>
                {PAYMENT_METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </SettingsSection>
        ) : null}

        {hasFeature(type, 'products') && (
          <SettingsSection title="Stock" icon="inventory">
            <Field label="Low-stock level for new products" hint="A product added without its own level uses this one. You get an alert when a product falls to its level. 0 means only warn when it runs out.">
              <input type="number" min="0" step="1" inputMode="numeric" value={level} onChange={touch(setLevel)} className={inputClass} />
            </Field>
          </SettingsSection>
        )}

        {hasFeature(type, 'laundry') && (
          <SettingsSection title="Laundry" icon="shirt">
            <Field label="Express charge (percent)" hint="Added to the price of an order when the customer wants it quickly. You can change it on any single order.">
              <input type="number" min="0" max="300" step="any" inputMode="decimal" value={express} onChange={touch(setExpress)} className={inputClass} />
            </Field>
          </SettingsSection>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <SavedNote show={saved} />
        </div>
      </form>
    </div>
  );
}
