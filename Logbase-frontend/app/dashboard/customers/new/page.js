'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import PhoneInput from '@/components/PhoneInput';
import { DEFAULT_COUNTRY, parsePhone } from '@/lib/phone';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', address: '', notes: '' });
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
      const data = await createCustomer({ ...form, phone: parsed.valid ? parsed.e164 : undefined });
      router.push(`/dashboard/customers/${data.customer._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Add a customer" backHref="/dashboard/customers" backLabel="Back to customers" />

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

        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5`}>
          {saving ? 'Saving…' : 'Add customer'}
        </button>
      </form>
    </div>
  );
}
