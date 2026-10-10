'use client';

import { notifySuccess } from '@/lib/feedback';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupplier } from '@/lib/api';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import PhoneInput from '@/components/PhoneInput';
import { DEFAULT_COUNTRY, parsePhone } from '@/lib/phone';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

export default function NewSupplierPage() {
  const router = useRouter();
  const { isOwner } = useUser();
  const [form, setForm] = useState({ name: '', email: '', address: '', notes: '', openingBalance: '' });
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // the phone number is optional here, but if it is typed it must be complete for its country
    const parsed = parsePhone(phoneCountry, phoneNumber);
    if (phoneNumber.trim() && !parsed.valid) {
      setError(parsed.message);
      return;
    }

    setSaving(true);
    try {
      const { openingBalance, ...details } = form;
      const data = await createSupplier({
        ...details,
        phone: parsed.valid ? parsed.e164 : undefined,
        ...(isOwner && openingBalance !== '' ? { openingBalance: Number(openingBalance) } : {}),
      });
      notifySuccess('Supplier added', (data.supplier && data.supplier.name) || details.name);
      router.push('/dashboard/suppliers');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Add a supplier" backHref="/dashboard/suppliers" backLabel="Back to suppliers" />

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4 p-6`}>
        <Field label="Name">
          <input name="name" value={form.name} onChange={handleChange} className={inputClass} required />
        </Field>
        <Field label="Phone">
          <PhoneInput
            country={phoneCountry}
            number={phoneNumber}
            onChange={({ country, number }) => {
              setPhoneCountry(country);
              setPhoneNumber(number);
            }}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
        </Field>
        <Field label="Address">
          <input name="address" value={form.address} onChange={handleChange} className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className={inputClass}
          />
        </Field>

        {isOwner && (
          <Field label="Amount you already owe them (₦, optional)" hint="Only if you owe this supplier money from before you started using LogBase. Leave it empty if you owe nothing.">
            <input
              type="number"
              name="openingBalance"
              min="0"
              step="any"
              value={form.openingBalance}
              onChange={handleChange}
              className={inputClass}
            />
          </Field>
        )}

        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5`}>
          {saving ? 'Saving…' : 'Add supplier'}
        </button>
      </form>
    </div>
  );
}
