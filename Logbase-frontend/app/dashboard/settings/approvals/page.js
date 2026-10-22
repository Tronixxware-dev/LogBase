'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { SettingsSection, Toggle, SavedNote } from '@/components/SettingsParts';
import { ErrorBanner, Field, inputClass, primaryButtonClass } from '@/components/ui';
import { saveApprovalPolicies } from '@/lib/api';
import { notifySuccess } from '@/lib/feedback';

// One rule: a switch, and the size that makes it apply
function Rule({ title, description, enabled, onToggle, fieldLabel, fieldHint, value, onValue, unit, step = 'any', max }) {
  return (
    <SettingsSection title={title} description={description} className="!mb-4">
      <Toggle label="Ask me first" checked={enabled} onChange={onToggle} />
      {enabled && (
        <div className="animate-fade-up mt-2 max-w-xs">
          <Field label={fieldLabel} hint={fieldHint}>
            <div className="relative">
              <input type="number" min="0" max={max} step={step} inputMode="decimal" value={value} onChange={(e) => onValue(e.target.value)} className={`${inputClass} ${unit === '%' ? 'pr-9' : unit ? 'pl-8' : ''}`} />
              {unit && <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-gray-400 ${unit === '%' ? 'right-3.5' : 'left-3.5'}`}>{unit}</span>}
            </div>
          </Field>
        </div>
      )}
    </SettingsSection>
  );
}

// Rules that make a staff's action wait for the administrator's OK. The administrator is never asked.
export default function ApprovalPoliciesPage() {
  const { user, settings, updateUser } = useUser();
  const p = settings.approvalPolicies;
  const [discounts, setDiscounts] = useState({ enabled: p.discounts.enabled, value: String(p.discounts.maxPercent) });
  const [credit, setCredit] = useState({ enabled: p.creditSales.enabled, value: String(p.creditSales.minAmount) });
  const [returns, setReturns] = useState({ enabled: p.returns.enabled, value: String(p.returns.minAmount) });
  const [stock, setStock] = useState({ enabled: p.stockAdjustments.enabled, value: String(p.stockAdjustments.minUnits) });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mark = (setter) => (changes) => {
    setSaved(false);
    setter((s) => ({ ...s, ...changes }));
  };

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const num = (v) => (v === '' ? 0 : Number(v));
    for (const [label, v] of [['The discount percent', discounts.value], ['The amount owed', credit.value], ['The return amount', returns.value], ['The number of units', stock.value]]) {
      if (!(num(v) >= 0) || !Number.isFinite(num(v))) return setError(`${label} must be 0 or more`);
    }
    if (num(discounts.value) > 100) return setError('A discount percent cannot be above 100');
    setSaving(true);
    try {
      const data = await saveApprovalPolicies({
        discounts: { enabled: discounts.enabled, maxPercent: num(discounts.value) },
        creditSales: { enabled: credit.enabled, minAmount: num(credit.value) },
        returns: { enabled: returns.enabled, minAmount: num(returns.value) },
        stockAdjustments: { enabled: stock.enabled, minUnits: num(stock.value) },
      });
      updateUser({ settings: { ...user.settings, ...data.settings } });
      setSaved(true);
      notifySuccess('Approval policies saved', 'They apply to your staff straight away');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Approval policies"
        subtitle="Choose what your staff must ask you about first. You are never asked: only your team is."
        backHref="/dashboard/settings"
        backLabel="Back to settings"
      />
      <ErrorBanner message={error} />
      <p className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        When a rule applies, nothing is saved yet. The request appears in your{' '}
        <Link href="/dashboard/approvals" className="font-semibold underline">Approvals</Link> and you get an alert. If you approve, it is recorded exactly as your staff entered it, under their name.
      </p>

      <form onSubmit={save}>
        <Rule
          title="Discounts"
          description="A sale priced below the product's selling price."
          enabled={discounts.enabled}
          onToggle={(v) => mark(setDiscounts)({ enabled: v })}
          fieldLabel="Ask me when the discount is above"
          fieldHint="For example 10 lets staff give up to 10% off. Use 0 to be asked about any discount."
          value={discounts.value}
          onValue={(v) => mark(setDiscounts)({ value: v })}
          unit="%"
          max="100"
        />
        <Rule
          title="Sales on credit"
          description="A sale the customer does not pay in full."
          enabled={credit.enabled}
          onToggle={(v) => mark(setCredit)({ enabled: v })}
          fieldLabel="Ask me when the amount owed is"
          fieldHint="This amount or more. Use 0 to be asked about every sale that is not fully paid."
          value={credit.value}
          onValue={(v) => mark(setCredit)({ value: v })}
          unit="₦"
        />
        <Rule
          title="Returns"
          description="A staff takes an item back from a customer."
          enabled={returns.enabled}
          onToggle={(v) => mark(setReturns)({ enabled: v })}
          fieldLabel="Ask me when the returned goods are worth"
          fieldHint="This amount or more. Use 0 to be asked about every return."
          value={returns.value}
          onValue={(v) => mark(setReturns)({ value: v })}
          unit="₦"
        />
        <Rule
          title="Stock changes"
          description="Damaged, lost, expired, stolen or found stock, and stock counts."
          enabled={stock.enabled}
          onToggle={(v) => mark(setStock)({ enabled: v })}
          fieldLabel="Ask me when the change is"
          fieldHint="This many units or more. Use 0 to be asked about every change. A stock count is always checked."
          value={stock.value}
          onValue={(v) => mark(setStock)({ value: v })}
          step="1"
        />

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Saving…' : 'Save policies'}
          </button>
          <SavedNote show={saved} />
        </div>
      </form>
    </div>
  );
}
