'use client';

import { ClothTile } from '@/components/ClothIcon';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createLaundryOrder, listLaundryItems } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { newClientId } from '@/lib/outbox';
import { dayInputValue, saveErrorMessage } from '@/lib/jobs';
import { SERVICES, laundryTotals, servicePrice } from '@/lib/laundry';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import CustomerPicker, { useCustomerPicker } from '@/components/CustomerPicker';
import { PaymentMethodSelect } from '@/components/JobParts';
import { ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

let rowCounter = 0;

// One row of the register. `item` is the item from the price list (null for an item typed by hand).
function newRow(item, extra = {}) {
  rowCounter += 1;
  return {
    key: rowCounter,
    item: item ? item._id : null,
    name: item ? item.name : '',
    listItem: item || null, // the item with all its prices, so the price follows the service
    service: 'wash',
    quantity: '',
    colour: '',
    stain: '',
    price: '', // empty = the price from the list
    dateIn: '',
    dateOut: '',
    remarks: '',
    extra: false, // a second row for an item that is already in the table
    ...extra,
  };
}

const cell = 'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none';

// the usual price from the list for what is being done to this row
function listPriceOf(row) {
  return servicePrice(row.listItem, row.service);
}

function priceOf(row) {
  return row.price !== '' ? Number(row.price) || 0 : listPriceOf(row);
}

function amountOf(row) {
  return (Math.floor(Number(row.quantity)) || 0) * priceOf(row);
}

export default function NewLaundryOrderPage() {
  const router = useRouter();
  const { user, isOwner, settings } = useUser();
  const picker = useCustomerPicker();

  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [dateIn, setDateIn] = useState(dayInputValue());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [handover, setHandover] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [express, setExpress] = useState(false);
  const [expressPercent, setExpressPercent] = useState(String(settings.preferences.expressPercent));
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [deposit, setDeposit] = useState('');
  const [depositMethod, setDepositMethod] = useState(settings.preferences.defaultPaymentMethod);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [planBlocked, setPlanBlocked] = useState(false); // the plan (free trial or paid) does not allow new orders
  const [saving, setSaving] = useState(false);
  // this order's own id: kept while the form is filled in and retried, so one that reached the server is not saved twice
  const orderId = useRef(null);

  useEffect(() => {
    listLaundryItems()
      .then((data) => setRows((data.items || []).map((item) => newRow(item))))
      .catch((err) => {
        setLoadError(err.message);
        setRows([]);
      });
  }, []);

  function update(key, changes) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  }

  // another row for the same item (a different colour, say) right under it
  function addSame(row) {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.key === row.key);
      const copy = newRow(row.listItem, { name: row.name, extra: true, service: row.service });
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addOther() {
    setRows((prev) => [...prev, newRow(null, { extra: true })]);
  }

  const filled = useMemo(() => (rows || []).filter((r) => Number(r.quantity) > 0), [rows]);
  const totalItems = filled.reduce((sum, r) => sum + Math.floor(Number(r.quantity)), 0);
  const subtotal = Math.round(filled.reduce((sum, r) => sum + amountOf(r), 0) * 100) / 100;
  const fee = handover === 'delivery' ? Number(deliveryFee) || 0 : 0;
  const sums = laundryTotals({ subtotal, express, expressPercent, discountType, discountValue, deliveryFee: fee });
  const total = sums.total;
  const depositNumber = Number(deposit) || 0;
  const balance = Math.max(total - depositNumber, 0);
  const hasUnpriced = filled.some((r) => priceOf(r) === 0);

  // every row gets the same service (a row can still be changed after)
  function setAllServices(service) {
    setRows((prev) => prev.map((r) => ({ ...r, service })));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPlanBlocked(false);

    if (filled.length === 0) return setError('Enter the quantity for at least one item');
    for (let i = 0; i < filled.length; i += 1) {
      const r = filled[i];
      const q = Number(r.quantity);
      if (!Number.isInteger(q) || q < 1 || q > 1000) return setError(`${r.name || 'An item'}: the quantity must be a whole number of 1 or more`);
      if (!r.item && !r.name.trim()) return setError('Type the name of the item you added, or remove that row');
      if (r.price !== '' && !(Number(r.price) >= 0)) return setError(`${r.name || 'An item'}: the price cannot be negative`);
    }
    if (total <= 0) {
      return setError(
        isOwner
          ? 'This order has no price yet. Set the prices under Items & prices, or type a price on each row.'
          : 'This order has no price yet. Type a price on each row, or ask the administrator to set the prices.'
      );
    }
    if (express && !(Number(expressPercent) >= 0 && Number(expressPercent) <= 300)) return setError('The express charge must be between 0 and 300 percent');
    if (discountValue !== '' && !(Number(discountValue) >= 0)) return setError('The discount cannot be negative');
    if (discountValue !== '' && discountType === 'percent' && Number(discountValue) > 100) return setError('A discount cannot be more than 100 percent');
    if (sums.tooMuch) return setError('The discount is more than the order');
    if (deliveryDate && deliveryDate < dateIn) return setError('The delivery date cannot be before the date the clothes came in');
    const address = deliveryAddress.trim() || (picker.matched ? picker.matched.address : picker.address.trim()) || '';
    if (handover === 'delivery' && !address) return setError('Enter the address to deliver to');
    if (depositNumber < 0) return setError('The deposit cannot be negative');
    if (depositNumber > total) return setError('The deposit is more than the total of the order');
    const problem = picker.problem();
    if (problem) return setError(problem);

    if (!orderId.current) orderId.current = newClientId();

    const lines = filled.map((r) => {
      const line = { quantity: Number(r.quantity), service: r.service, colour: r.colour.trim(), stain: r.stain.trim(), remarks: r.remarks.trim() };
      if (r.item) line.item = r.item;
      else line.itemName = r.name.trim();
      if (r.price !== '') line.price = Number(r.price);
      if (r.dateIn) line.dateIn = r.dateIn;
      if (r.dateOut) line.dateOut = r.dateOut;
      return line;
    });

    setSaving(true);
    try {
      const customer = await picker.resolve();
      const data = await createLaundryOrder({
        customer: customer._id,
        lines,
        handover,
        deliveryAddress: handover === 'delivery' ? address : undefined,
        deliveryFee: handover === 'delivery' ? fee : undefined,
        express,
        expressPercent: express ? Number(expressPercent) || 0 : undefined,
        discountType: Number(discountValue) > 0 ? discountType : undefined,
        discountValue: Number(discountValue) > 0 ? Number(discountValue) : undefined,
        dateIn,
        deliveryDate: deliveryDate || undefined,
        deposit: depositNumber,
        depositMethod,
        notes: notes.trim(),
        clientId: orderId.current,
      });
      notifySuccess('Laundry order saved', `${data.order.code} for ${customer.name}`);
      router.push(`/dashboard/laundry/${data.order._id}`);
    } catch (err) {
      setError(saveErrorMessage(err, 'order'));
      setPlanBlocked(Boolean(err && err.status === 402));
    } finally {
      setSaving(false);
    }
  }

  if (rows === null) return <LoadingState />;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="New laundry order"
        subtitle="Type the quantity beside each item the customer brought. Leave the others empty."
        backHref="/dashboard/laundry"
        backLabel="Back to laundry"
      />

      <ErrorBanner message={error || loadError || picker.loadError} />
      {planBlocked && (
        <p className="-mt-2 mb-4 text-sm text-gray-600">
          {isOwner ? (
            <Link href="/dashboard/billing" className="font-medium text-primary hover:underline">
              See plans on the Billing page
            </Link>
          ) : (
            'Ask the owner of the business to choose a plan.'
          )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <CustomerPicker picker={picker} savedNote="They will be saved automatically with this order." />
            {picker.matched && picker.matched.notes && (
              <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Remember for {picker.matched.name}</p>
                <p className="mt-0.5 whitespace-pre-wrap">{picker.matched.notes}</p>
              </div>
            )}
          </div>

          <div className={`${cardClass} space-y-4 p-4`}>
            <p className="text-sm font-semibold text-gray-900">Dates and hand-over</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date in">
                <input type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} className={inputClass} required />
              </Field>
              <Field label="Date out (promised)">
                <input type="date" min={dateIn} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />
              </Field>
            </div>
            <div>
              <p id="handover-label" className="mb-1.5 text-sm font-medium text-gray-700">
                How will the customer get the clothes back?
              </p>
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="radiogroup" aria-labelledby="handover-label">
                {[
                  { value: 'pickup', label: 'Pick-up' },
                  { value: 'delivery', label: 'Delivery' },
                ].map((o) => (
                  <label
                    key={o.value}
                    className={`cursor-pointer rounded-md px-5 py-1.5 text-sm transition focus-within:ring-2 focus-within:ring-primary ${
                      handover === o.value ? 'bg-primary font-medium text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <input type="radio" name="handover" checked={handover === o.value} onChange={() => setHandover(o.value)} className="sr-only" />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            {handover === 'pickup' && <p className="text-xs text-gray-400">You can still choose delivery later, when the clothes are ready.</p>}
            {handover === 'delivery' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Delivery address" hint="Leave empty to use the customer's saved address.">
                  <input type="text" maxLength={200} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Delivery fee (₦)">
                  <input type="number" min="0" step="any" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={inputClass} />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* the register */}
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Items</p>
              <p className="text-xs text-gray-400">
                The price comes from your price list for the service chosen; type a price to change it for this order. Empty dates use the dates above.
              </p>
            </div>
            <label className="text-xs text-gray-500">
              Service for every row
              <ServiceSelect value="" onChange={setAllServices} label="Service for every row" placeholder="Choose…" className="mt-1 w-40" />
            </label>
          </div>

          {rows.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500">
              Your item list is empty.{' '}
              {isOwner ? (
                <Link href="/dashboard/laundry/items" className="font-medium text-primary hover:underline">
                  Add your items and prices
                </Link>
              ) : (
                'Ask the administrator to add your items. You can also add an item by hand below.'
              )}
            </p>
          )}

          {/* tablets and computers: the register as a table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="border-b-2 border-gray-300 bg-gray-100 text-left">
                <tr className="text-xs font-bold uppercase tracking-wide text-gray-700">
                  <th className="w-10 px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="w-44 px-2 py-2.5">Service</th>
                  <th className="w-20 px-2 py-2.5">Qty</th>
                  <th className="px-2 py-2.5">Colour / description</th>
                  <th className="px-2 py-2.5">Stain / special care</th>
                  <th className="w-28 px-2 py-2.5">Price each (₦)</th>
                  <th className="w-28 px-2 py-2.5 text-right">Amount</th>
                  <th className="w-36 px-2 py-2.5">Date in</th>
                  <th className="w-36 px-2 py-2.5">Date out</th>
                  <th className="px-2 py-2.5">Remarks</th>
                  <th className="w-16 px-2 py-2.5" aria-label="Row actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r, index) => {
                  const on = Number(r.quantity) > 0;
                  return (
                    <tr key={r.key} className={on ? 'bg-primary/[0.03]' : ''}>
                      <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        <span className="flex items-center gap-2.5">
                          <ClothTile name={r.name} size="sm" />
                          {r.item || !r.extra ? (
                            r.name
                          ) : (
                            <input type="text" maxLength={60} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Item name" aria-label="Item name" className={cell} />
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <ServiceSelect value={r.service} onChange={(service) => update(r.key, { service })} label={`Service for ${r.name || 'item'}`} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="0" step="1" value={r.quantity} onChange={(e) => update(r.key, { quantity: e.target.value })} aria-label={`Quantity of ${r.name || 'item'}`} className={cell} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" maxLength={80} value={r.colour} onChange={(e) => update(r.key, { colour: e.target.value })} aria-label="Colour or description" className={cell} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" maxLength={120} value={r.stain} onChange={(e) => update(r.key, { stain: e.target.value })} aria-label="Stain or special care" className={cell} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="0" step="any" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} placeholder={String(listPriceOf(r))} aria-label="Price each" className={cell} />
                      </td>
                      <td className="tabular px-2 py-2 text-right font-medium text-gray-900">{on ? formatMoney(amountOf(r)) : ''}</td>
                      <td className="px-2 py-2">
                        <input type="date" value={r.dateIn} onChange={(e) => update(r.key, { dateIn: e.target.value })} aria-label="Date in" className={cell} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="date" value={r.dateOut} onChange={(e) => update(r.key, { dateOut: e.target.value })} aria-label="Date out" className={cell} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" maxLength={120} value={r.remarks} onChange={(e) => update(r.key, { remarks: e.target.value })} aria-label="Remarks" className={cell} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <RowButtons row={r} onAdd={() => addSame(r)} onRemove={() => removeRow(r.key)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* phones: one card per item */}
          <div className="divide-y divide-gray-100 md:hidden">
            {rows.map((r, index) => {
              const on = Number(r.quantity) > 0;
              return (
                <div key={r.key} className={`space-y-3 p-4 ${on ? 'bg-primary/[0.03]' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs text-gray-400">{index + 1}</span>
                    <ClothTile name={r.name} size="sm" />
                    <div className="min-w-0 flex-1 break-words font-medium text-gray-900">
                      {r.item || !r.extra ? (
                        r.name
                      ) : (
                        <input type="text" maxLength={60} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Item name" aria-label="Item name" className={cell} />
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={r.quantity}
                      onChange={(e) => update(r.key, { quantity: e.target.value })}
                      placeholder="Qty"
                      aria-label={`Quantity of ${r.name || 'item'}`}
                      className={`${cell} !w-20`}
                    />
                  </div>
                  {on && (
                    <div className="grid grid-cols-2 gap-3 pl-9">
                      <label className="col-span-2 text-xs text-gray-500">
                        Service
                        <ServiceSelect value={r.service} onChange={(service) => update(r.key, { service })} label={`Service for ${r.name || 'item'}`} className="mt-1" />
                      </label>
                      <label className="col-span-2 text-xs text-gray-500">
                        Colour / description
                        <input type="text" maxLength={80} value={r.colour} onChange={(e) => update(r.key, { colour: e.target.value })} className={`${cell} mt-1`} />
                      </label>
                      <label className="col-span-2 text-xs text-gray-500">
                        Stain / special care
                        <input type="text" maxLength={120} value={r.stain} onChange={(e) => update(r.key, { stain: e.target.value })} className={`${cell} mt-1`} />
                      </label>
                      <label className="text-xs text-gray-500">
                        Price each (₦)
                        <input type="number" min="0" step="any" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} placeholder={String(listPriceOf(r))} className={`${cell} mt-1`} />
                      </label>
                      <p className="text-xs text-gray-500">
                        Amount
                        <span className="tabular mt-1 block py-1.5 text-sm font-semibold text-gray-900">{formatMoney(amountOf(r))}</span>
                      </p>
                      <label className="text-xs text-gray-500">
                        Date in
                        <input type="date" value={r.dateIn} onChange={(e) => update(r.key, { dateIn: e.target.value })} className={`${cell} mt-1`} />
                      </label>
                      <label className="text-xs text-gray-500">
                        Date out
                        <input type="date" value={r.dateOut} onChange={(e) => update(r.key, { dateOut: e.target.value })} className={`${cell} mt-1`} />
                      </label>
                      <label className="col-span-2 text-xs text-gray-500">
                        Remarks
                        <input type="text" maxLength={120} value={r.remarks} onChange={(e) => update(r.key, { remarks: e.target.value })} className={`${cell} mt-1`} />
                      </label>
                    </div>
                  )}
                  <div className="pl-9">
                    <RowButtons row={r} onAdd={() => addSame(r)} onRemove={() => removeRow(r.key)} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-200 px-4 py-3">
            <button type="button" onClick={addOther} className="text-sm font-medium text-primary hover:underline">
              + Add an item that is not in the list
            </button>
          </div>
        </div>

        {/* totals */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={`${cardClass} space-y-4 p-4`}>
            <Field label="Notes (optional)">
              <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
            </Field>
            <p className="text-sm text-gray-500">
              Taken in by <span className="font-medium text-gray-700">{user.name}</span>
            </p>
          </div>

          <div className={`${cardClass} space-y-3 p-4`}>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total pieces</span>
              <span className="tabular font-medium text-gray-900">{totalItems}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Items</span>
              <span className="tabular font-medium text-gray-900">{formatMoney(subtotal)}</span>
            </div>

            <div className="rounded-xl border border-gray-200 p-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-800">
                <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Express / same-day
                <span className="text-xs font-normal text-gray-400">costs extra</span>
              </label>
              {express && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>Extra charge</span>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="any"
                    value={expressPercent}
                    onChange={(e) => setExpressPercent(e.target.value)}
                    aria-label="Express charge in percent"
                    className={`${cell} !w-20`}
                  />
                  <span>% of the items</span>
                  <span className="tabular ml-auto font-medium text-gray-900">+{formatMoney(sums.expressFee)}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-3">
              <p className="mb-2 text-sm font-medium text-gray-800">Discount</p>
              <div className="flex flex-wrap items-center gap-2">
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} aria-label="Discount type" className={`${cell} !w-36`}>
                  <option value="amount">Amount (₦)</option>
                  <option value="percent">Percent (%)</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  aria-label="Discount"
                  className={`${cell} !w-28`}
                />
                {sums.discount > 0 && <span className="tabular ml-auto text-sm font-medium text-green-700">−{formatMoney(sums.discount)}</span>}
              </div>
              {sums.tooMuch && <p className="mt-2 text-xs text-red-600">The discount is more than the order.</p>}
            </div>

            {handover === 'delivery' && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery fee</span>
                <span className="tabular font-medium text-gray-900">{formatMoney(fee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 ring-1 ring-primary/15">
              <span className="text-sm text-gray-600">Total to pay</span>
              <span className="tabular text-xl font-semibold text-gray-900">{formatMoney(total)}</span>
            </div>
            {hasUnpriced && (
              <p className="text-xs text-amber-700">
                Some items have no price.{' '}
                {isOwner ? (
                  <Link href="/dashboard/laundry/items" className="underline">
                    Set the prices
                  </Link>
                ) : (
                  'Ask the administrator to set the prices, or type a price on the row.'
                )}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Deposit paid now (₦)">
                <input type="number" min="0" step="any" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputClass} />
              </Field>
              {depositNumber > 0 && (
                <Field label="Paid by">
                  <PaymentMethodSelect value={depositMethod} onChange={setDepositMethod} />
                </Field>
              )}
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Balance</span>
              <span className="tabular font-semibold text-gray-900">{formatMoney(balance)}</span>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5 sm:w-auto sm:px-10`}>
          {saving ? 'Saving…' : 'Save laundry order'}
        </button>
      </form>
    </div>
  );
}

function RowButtons({ row, onAdd, onRemove }) {
  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap text-xs">
      <button type="button" onClick={onAdd} className="font-medium text-primary hover:underline" title="Add another row for this item (for example a different colour)">
        + Row
      </button>
      {row.extra && (
        <button type="button" onClick={onRemove} className="text-red-600 hover:underline">
          Remove
        </button>
      )}
    </span>
  );
}

// Wash / Wash & iron / Iron only / Dry clean
function ServiceSelect({ value, onChange, label, className = '', placeholder }) {
  return (
    <select value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label={label} className={`${cell} ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {SERVICES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
