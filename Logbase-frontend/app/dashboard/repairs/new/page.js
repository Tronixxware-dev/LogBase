'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRepair } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { newClientId } from '@/lib/outbox';
import { dayInputValue, saveErrorMessage } from '@/lib/jobs';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import CustomerPicker, { useCustomerPicker } from '@/components/CustomerPicker';
import { PaymentMethodSelect } from '@/components/JobParts';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

export default function NewRepairPage() {
  const router = useRouter();
  const { user, settings } = useUser();
  const picker = useCustomerPicker();

  const [device, setDevice] = useState('');
  const [imei, setImei] = useState('');
  const [accessories, setAccessories] = useState('');
  const [fault, setFault] = useState('');
  const [quote, setQuote] = useState('');
  const [deposit, setDeposit] = useState('');
  const [depositMethod, setDepositMethod] = useState(settings.preferences.defaultPaymentMethod);
  const [technician, setTechnician] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // this job's own id: kept while the form is filled in and retried, so one that reached the server is not saved twice
  const jobId = useRef(null);

  const quoteNumber = Number(quote) || 0;
  const depositNumber = Number(deposit) || 0;
  const balance = Math.max(quoteNumber - depositNumber, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!device.trim()) return setError('Enter the device (for example: Samsung A14)');
    if (!fault.trim()) return setError('Describe the fault');
    if (depositNumber < 0 || quoteNumber < 0) return setError('Amounts cannot be negative');
    if (quoteNumber > 0 && depositNumber > quoteNumber) return setError('The deposit is more than the quote');
    const problem = picker.problem();
    if (problem) return setError(problem);

    if (!jobId.current) jobId.current = newClientId();

    setSaving(true);
    try {
      const customer = await picker.resolve();
      const data = await createRepair({
        customer: customer._id,
        device: device.trim(),
        imei: imei.trim(),
        accessories: accessories.trim(),
        fault: fault.trim(),
        quote: quoteNumber,
        deposit: depositNumber,
        depositMethod,
        technician: technician.trim(),
        promisedDate: promisedDate || undefined,
        notes: notes.trim(),
        clientId: jobId.current,
      });
      notifySuccess('Repair taken in', `${data.repair.code} for ${customer.name}`);
      router.push(`/dashboard/repairs/${data.repair._id}`);
    } catch (err) {
      setError(saveErrorMessage(err, 'job'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Take in a repair"
        subtitle="Write down the device, the fault and any deposit. You can print a job slip for the customer afterwards."
        backHref="/dashboard/repairs"
        backLabel="Back to repairs"
      />

      <ErrorBanner message={error || picker.loadError} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4 p-6`}>
        <CustomerPicker picker={picker} savedNote="They will be saved automatically with this job." />

        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Device</p>
          <Field label="Device" hint="For example: Samsung A14, iPhone 11, HP laptop.">
            <input type="text" maxLength={100} value={device} onChange={(e) => setDevice(e.target.value)} className={inputClass} required />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="IMEI / serial (optional)">
              <input type="text" maxLength={40} value={imei} onChange={(e) => setImei(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Left with the device (optional)" hint="Charger, case, SIM, memory card…">
              <input type="text" maxLength={200} value={accessories} onChange={(e) => setAccessories(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="What is wrong with it?">
            <textarea rows={3} maxLength={500} value={fault} onChange={(e) => setFault(e.target.value)} className={inputClass} required />
          </Field>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Price and deposit</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Quote (₦)" hint="Leave empty if the price is not known yet. You can set it later.">
              <input type="number" min="0" step="any" value={quote} onChange={(e) => setQuote(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Deposit paid now (₦)">
              <input type="number" min="0" step="any" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputClass} />
            </Field>
          </div>
          {depositNumber > 0 && (
            <Field label="Deposit paid by">
              <PaymentMethodSelect value={depositMethod} onChange={setDepositMethod} />
            </Field>
          )}
          {quoteNumber > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 text-sm ring-1 ring-primary/15">
              <span className="text-gray-600">Balance to pay on collection</span>
              <span className="tabular text-lg font-semibold text-gray-900">{formatMoney(balance)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Technician (optional)">
            <input type="text" maxLength={80} value={technician} onChange={(e) => setTechnician(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Promised date (optional)">
            <input type="date" min={dayInputValue()} value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>

        <p className="text-sm text-gray-500">
          Taken in by <span className="font-medium text-gray-700">{user.name}</span>
        </p>

        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5`}>
          {saving ? 'Saving…' : 'Save repair job'}
        </button>
      </form>
    </div>
  );
}
