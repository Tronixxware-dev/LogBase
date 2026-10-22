'use client';

import { useCallback, useEffect, useState } from 'react';
import { createCustomer, listCustomers } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { DEFAULT_COUNTRY, parsePhone, phoneKey } from '@/lib/phone';
import PhoneInput from '@/components/PhoneInput';
import { Field, inputClass } from '@/components/ui';

// The customer part of a form, the same way the sales form does it: the phone number finds the saved customer,
// and a new number means a new customer who is saved together with the record.
//
//   const picker = useCustomerPicker();
//   <CustomerPicker picker={picker} />
//   picker.problem()   -> '' or the sentence to show when the customer part is not filled in properly
//   await picker.resolve()   -> the saved customer { _id, name, phone, address } (saves a new one first)
export function useCustomerPicker() {
  const [customers, setCustomers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    listCustomers()
      .then((data) => setCustomers(data.customers || []))
      .catch((err) => setLoadError(err.message));
  }, []);

  const parsed = parsePhone(country, phone);
  const matched = parsed.valid ? customers.find((c) => phoneKey(c.phone) === parsed.key) || null : null;
  const isNew = parsed.valid && !matched;

  const problem = useCallback(() => {
    if (!parsed.valid) return parsed.message;
    if (!matched && !name.trim()) return 'This phone number is new. Enter the customer name so they can be saved.';
    return '';
  }, [parsed.valid, parsed.message, matched, name]);

  // The customer to use. A new number is saved first and then known, so trying again finds them instead of saving them twice.
  async function resolve() {
    if (matched) return matched;
    const created = await createCustomer({ name: name.trim(), phone: parsed.e164, address: address.trim() || undefined });
    setCustomers((prev) => [...prev, created.customer]);
    return created.customer;
  }

  function reset() {
    setPhone('');
    setName('');
    setAddress('');
  }

  return {
    country,
    setCountry,
    phone,
    setPhone,
    name,
    setName,
    address,
    setAddress,
    parsed,
    matched,
    isNew,
    loadError,
    problem,
    resolve,
    reset,
  };
}

export default function CustomerPicker({ picker, title = 'Customer', savedNote = 'They will be saved automatically with this record.' }) {
  const { matched, isNew } = picker;
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900">{title}</p>

      <Field
        label={
          <>
            Phone number <span className="text-red-500">(required)</span>
          </>
        }
        hint="Pick the country, then type the number. Existing customers are found automatically."
      >
        <PhoneInput
          country={picker.country}
          number={picker.phone}
          onChange={({ country, number }) => {
            picker.setCountry(country);
            picker.setPhone(number);
          }}
          required
        />
      </Field>

      {matched && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">Existing customer: {matched.name}</p>
          {matched.address && <p className="text-xs">{matched.address}</p>}
          {matched.balance > 0 && <p className="text-xs">Currently owes {formatMoney(matched.balance)}</p>}
        </div>
      )}

      {isNew && (
        <>
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-800">New customer. {savedNote}</p>
          <Field label="Customer name">
            <input type="text" value={picker.name} onChange={(e) => picker.setName(e.target.value)} className={inputClass} required />
          </Field>
          <Field label="Address (optional)">
            <input type="text" value={picker.address} onChange={(e) => picker.setAddress(e.target.value)} className={inputClass} />
          </Field>
        </>
      )}
    </div>
  );
}
