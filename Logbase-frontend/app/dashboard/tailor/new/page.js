'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTailorOrder, listMeasurements, listTailorStyles, listWorkers, saveMeasurements, uploadTailorPhotos } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { newClientId } from '@/lib/outbox';
import { dayInputValue, saveErrorMessage } from '@/lib/jobs';
import { UNITS, filledRows, ordersTotal } from '@/lib/tailor';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import CustomerPicker, { useCustomerPicker } from '@/components/CustomerPicker';
import PhotosPicker from '@/components/PhotosPicker';
import { PaymentMethodSelect } from '@/components/JobParts';
import { PieceForm, emptyPiece, pieceToPayload } from '@/components/TailorParts';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

export default function NewTailorOrderPage() {
  const router = useRouter();
  const { user, settings, isOwner } = useUser();
  const picker = useCustomerPicker();

  const [styles, setStyles] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [saved, setSaved] = useState([]); // the matched customer's saved measurement sets
  const [pieces, setPieces] = useState([emptyPiece()]);
  const [unit, setUnit] = useState('in');
  const [occasion, setOccasion] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('');
  const [deposit, setDeposit] = useState('');
  const [depositMethod, setDepositMethod] = useState(settings.preferences.defaultPaymentMethod);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [saveSet, setSaveSet] = useState(true);
  const [setLabel, setSetLabel] = useState('Main');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const orderId = useRef(null);

  useEffect(() => {
    listTailorStyles().then((d) => setStyles(d.styles || [])).catch(() => {});
    listWorkers({ kind: 'tailor', active: '1' }).then((d) => setTailors(d.workers || [])).catch(() => {});
  }, []);

  // when the phone number belongs to a saved customer, their saved measurements are offered
  const matchedId = picker.matched ? picker.matched._id : '';
  useEffect(() => {
    if (!matchedId) {
      setSaved([]);
      return;
    }
    listMeasurements({ customer: matchedId }).then((d) => setSaved(d.measurements || [])).catch(() => setSaved([]));
  }, [matchedId]);

  const subtotal = ordersTotal(pieces.map((p) => ({ price: p.price, quantity: p.quantity })));
  const discountNumber = Number(discount) || 0;
  const total = ordersTotal(pieces.map((p) => ({ price: p.price, quantity: p.quantity })), discountNumber);
  const depositNumber = Number(deposit) || 0;
  const balance = Math.max(total - depositNumber, 0);

  function updatePiece(index, next) {
    setPieces((list) => list.map((p, i) => (i === index ? next : p)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (pieces.some((p) => !p.style.trim())) return setError('Enter what is to be sewn for every garment');
    if (discountNumber < 0 || depositNumber < 0) return setError('Amounts cannot be negative');
    if (discountNumber > subtotal) return setError('The discount is more than the price of the garments');
    if (total > 0 && depositNumber > total) return setError('The deposit is more than the price of the order');
    const problem = picker.problem();
    if (problem) return setError(problem);

    if (!orderId.current) orderId.current = newClientId();
    setSaving(true);
    try {
      const customer = await picker.resolve();
      const data = await createTailorOrder({
        customer: customer._id,
        occasion: occasion.trim(),
        unit,
        pieces: pieces.map((p) => pieceToPayload(p, { isOwner })),
        discount: discountNumber,
        deposit: depositNumber,
        depositMethod,
        dueDate: dueDate || undefined,
        notes: notes.trim(),
        clientId: orderId.current,
      });
      const order = data.order;

      // the measurements are kept for next time; the style pictures go up now. Neither can undo the order if it fails.
      let warning = '';
      if (saveSet && !data.duplicate) {
        const merged = [];
        for (const p of pieces) for (const m of filledRows(p.rows)) {
          const i = merged.findIndex((x) => x.name.toLowerCase() === m.name.toLowerCase());
          if (i >= 0) merged[i] = m;
          else merged.push(m);
        }
        if (merged.length > 0) {
          try {
            await saveMeasurements({ customer: customer._id, label: setLabel.trim() || 'Main', unit, values: merged });
          } catch (err) {
            warning = 'The order was saved, but the measurements could not be kept for next time.';
          }
        }
      }
      if (photos.length > 0) {
        try {
          await uploadTailorPhotos(order._id, photos);
        } catch (err) {
          warning = `${warning} The order was saved, but the pictures could not be uploaded. Add them on the order page.`.trim();
        }
      }
      notifySuccess('Order taken', `${order.code} for ${customer.name}${warning ? `. ${warning}` : ''}`);
      router.push(`/dashboard/tailor/${order._id}`);
    } catch (err) {
      setError(saveErrorMessage(err, 'order'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New tailoring order"
        subtitle="Write down who it is for, what to sew, the measurements, the price and the deposit. You can print a slip for the customer afterwards."
        backHref="/dashboard/tailor"
        backLabel="Back to orders"
      />

      <ErrorBanner message={error || picker.loadError} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-5 p-6`}>
        <CustomerPicker picker={picker} savedNote="They will be saved automatically with this order." />
        {saved.length > 0 && (
          <p className="-mt-2 rounded-lg bg-primary/5 px-4 py-2.5 text-xs text-gray-600 ring-1 ring-primary/15">
            This customer has measurements saved ({saved.map((s) => s.label).join(', ')}). Use them on each garment below.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Occasion (optional)" hint="Wedding, owambe, office, school…">
            <input type="text" maxLength={100} value={occasion} onChange={(e) => setOccasion(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Date to deliver">
            <input type="date" min={dayInputValue()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Measured in">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="space-y-4">
          {pieces.map((p, i) => (
            <PieceForm
              key={p.key}
              piece={p}
              index={i}
              styles={styles}
              tailors={tailors}
              saved={saved}
              unit={unit}
              isOwner={isOwner}
              canRemove={pieces.length > 1}
              onChange={(next) => updatePiece(i, next)}
              onRemove={() => setPieces((list) => list.filter((_, j) => j !== i))}
            />
          ))}
          <button type="button" onClick={() => setPieces((list) => [...list, emptyPiece()])} className={`${secondaryButtonClass} w-full`}>
            + Add another garment
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Price and deposit</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Discount (optional, ₦)">
              <input type="number" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputClass} />
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
          <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm ring-1 ring-primary/15">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Price of the order</span>
              <span className="tabular font-semibold text-gray-900">{formatMoney(total)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-gray-600">Balance to pay on delivery</span>
              <span className="tabular text-lg font-semibold text-gray-900">{formatMoney(balance)}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Style pictures (optional)</p>
          <PhotosPicker files={photos} onChange={setPhotos} max={6} disabled={saving} hint="A picture of the style the customer wants." />
        </div>

        <Field label="Notes (optional)">
          <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>

        <div className="rounded-xl border border-gray-200 p-4">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input type="checkbox" checked={saveSet} onChange={(e) => setSaveSet(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary" />
            <span>
              Keep these measurements for this customer, so they are not measured again next time.
              {saveSet && (
                <span className="mt-2 block">
                  <span className="text-xs text-gray-500">Name for this set (for example: Main, Husband, Son)</span>
                  <input type="text" maxLength={60} value={setLabel} onChange={(e) => setSetLabel(e.target.value)} className={`${inputClass} mt-1 !py-2 sm:max-w-xs`} />
                </span>
              )}
            </span>
          </label>
        </div>

        <p className="text-sm text-gray-500">
          Taken by <span className="font-medium text-gray-700">{user.name}</span>
        </p>

        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5`}>
          {saving ? 'Saving…' : 'Save order'}
        </button>
      </form>
    </div>
  );
}
