'use client';

import { ClothTile } from '@/components/ClothIcon';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { addLaundryPayment, deleteLaundryOrder, getLaundryOrder, listLaundryItems, setLaundryStatus, updateLaundryOrder } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { dayInputValue } from '@/lib/jobs';
import { SERVICES, isDelivery, laundryTotals, servicePrice } from '@/lib/laundry';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { PaymentForm, PaymentsList, SectionCard } from '@/components/JobParts';
import { Detail, DetailCard, DetailGrid } from '@/components/DetailParts';
import LaundryProgress from '@/components/LaundryProgress';
import { ExpressBadge, LaundryStatusBadge, ServiceNote } from '@/components/LaundryParts';
import { ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

const cell = 'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none';

export default function LaundryOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, can, isOwner } = useUser();
  const canWrite = can('recordSales');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getLaundryOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const act = useCallback(async (work, message) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const data = await work();
      if (data && data.order) setOrder(data.order);
      if (message) setNotice(message);
      return true;
    } catch (err) {
      setError(err.offline ? 'There is no connection, so we could not confirm that this was saved. Look at the page again before you try again.' : err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  if (loading) return <LoadingState />;
  if (!order) {
    return (
      <>
        <PageHeader title="Laundry order not found" backHref="/dashboard/laundry" backLabel="Back to laundry" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const open = order.status !== 'collected';
  const phone = describePhone(order.customerPhone);
  const hasMoney = order.payments && order.payments.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`${order.code} · ${order.customerName}`}
        subtitle={`${order.totalItems} ${order.totalItems === 1 ? 'piece' : 'pieces'} · in ${formatDate(order.dateIn)}${order.express ? ' · Express' : ''}`}
        backHref="/dashboard/laundry"
        backLabel="Back to laundry"
        action={
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/laundry/${order._id}/slip`} className={secondaryButtonClass}>
              Slip
            </Link>
            <Link href={`/dashboard/laundry/${order._id}/tag`} className={secondaryButtonClass}>
              Tags
            </Link>
            <LaundryStatusBadge order={order} />
          </div>
        }
      />

      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {order.customerNotes && (
        <div role="note" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Remember for {order.customerName}</p>
          <p className="mt-0.5 whitespace-pre-wrap">{order.customerNotes}</p>
        </div>
      )}

      <SectionCard title="Progress">
        <LaundryProgress order={order} canWrite={canWrite} busy={busy} act={act} businessName={user?.businessName} onOrder={setOrder} />
      </SectionCard>

      {editing ? (
        <EditOrder
          order={order}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={async (payload) => {
            const ok = await act(() => updateLaundryOrder(order._id, payload), 'Order updated');
            if (ok) setEditing(false);
          }}
        />
      ) : (
        <>
          <SectionCard
            title="Items"
            action={
              canWrite && open ? (
                <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-primary hover:underline">
                  Edit order
                </button>
              ) : undefined
            }
          >
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b-2 border-gray-300 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 pr-3">Colour / description</th>
                    <th className="py-2 pr-3">Stain / special care</th>
                    <th className="py-2 pr-3 text-right">Price each</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3">Date in</th>
                    <th className="py-2 pr-3">Date out</th>
                    <th className="py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {order.lines.map((l, i) => (
                    <tr key={l._id || i}>
                      <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium text-gray-900">
                        <span className="flex items-center gap-2.5">
                          <ClothTile name={l.itemName} size="sm" />
                          <span>
                            {l.itemName}
                            <ServiceNote service={l.service} />
                          </span>
                        </span>
                      </td>
                      <td className="py-2 pr-3">{l.quantity}</td>
                      <td className="py-2 pr-3">{l.colour || '—'}</td>
                      <td className="py-2 pr-3">{l.stain || '—'}</td>
                      <td className="tabular py-2 pr-3 text-right">{formatMoney(l.price)}</td>
                      <td className="tabular py-2 pr-3 text-right font-medium text-gray-900">{formatMoney(l.quantity * l.price)}</td>
                      <td className="py-2 pr-3">{l.dateIn ? formatDate(l.dateIn) : '—'}</td>
                      <td className="py-2 pr-3">{l.dateOut ? formatDate(l.dateOut) : '—'}</td>
                      <td className="py-2">{l.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{order.totalItems} pieces</span>
                <span className="tabular">{formatMoney(order.subtotal)}</span>
              </div>
              {order.express && order.expressFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Express / same-day (+{order.expressPercent}%)</span>
                  <span className="tabular">{formatMoney(order.expressFee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount{order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}</span>
                  <span className="tabular">−{formatMoney(order.discount)}</span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span className="tabular">{formatMoney(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span className="tabular">{formatMoney(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Paid so far</span>
                <span className="tabular">{formatMoney(order.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900">Balance</span>
                <span className={`tabular ${order.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{order.balance > 0 ? formatMoney(order.balance) : 'Paid in full'}</span>
              </div>
            </div>
          </SectionCard>

          <DetailCard title="Customer and hand-over" icon="customers">
            <DetailGrid>
              <Detail label="Customer" icon="user" color="sky">{order.customerName}</Detail>
              <Detail label="Phone number" icon="phone" color="sky">{phone.display}</Detail>
              <Detail label="Taken in by" icon="user" color="violet">{order.recordedByName}</Detail>
              <Detail label="Date in" icon="calendar" color="violet">{formatDate(order.dateIn)}</Detail>
              <Detail label="Date out (promised)" icon="calendar" color="amber">{order.deliveryDate ? formatDate(order.deliveryDate) : ''}</Detail>
              <Detail label="Hand-over" icon="deliveries" color="teal">{isDelivery(order) ? 'Delivery' : 'Pick-up'}</Detail>
              {order.express && (
                <Detail label="Speed" icon="bolt" color="amber">
                  <ExpressBadge percent={order.expressPercent} />
                </Detail>
              )}
              {isDelivery(order) && (
                <>
                  <Detail label="Deliver to" icon="pin" color="rose" wide>{order.deliveryAddress}</Detail>
                  <Detail label="Delivery fee" icon="naira" color="green">{order.deliveryFee > 0 ? formatMoney(order.deliveryFee) : 'None'}</Detail>
                  <Detail label="Rider" icon="user" color="sky">
                    {order.riderName ? `${order.riderName}${order.riderPhone ? ` · ${order.riderPhone}` : ''}` : ''}
                  </Detail>
                  {order.outAt && <Detail label="Went out" icon="clock" color="violet">{formatDateTime(order.outAt)}</Detail>}
                </>
              )}
              {order.notes && <Detail label="Notes" icon="note" color="amber" wide>{order.notes}</Detail>}
            </DetailGrid>
          </DetailCard>
        </>
      )}

      <SectionCard title="Payments">
        <PaymentsList payments={order.payments} />
        {canWrite && open && order.balance > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Take a payment</p>
            <PaymentForm balance={order.balance} busy={busy} onSubmit={(payload) => act(() => addLaundryPayment(order._id, payload), 'Payment recorded')} />
          </div>
        )}
      </SectionCard>

      {isOwner && open && !hasMoney && (
        <div className={`${cardClass} p-6`}>
          <h2 className="mb-1 text-lg font-medium text-gray-900">Entered by mistake?</h2>
          <p className="mb-4 text-xs text-gray-400">Only possible before any money is taken.</p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">Delete this order for good?</span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await deleteLaundryOrder(order._id);
                    router.push('/dashboard/laundry');
                  } catch (err) {
                    setError(err.message);
                    setConfirmDelete(false);
                    setBusy(false);
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={secondaryButtonClass}>
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-medium text-red-600 hover:underline">
              Delete this order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

let editKey = 0;

// Changing an order: the rows of the register (service, quantity, colour, price…), express, discount and the hand-over details.
function EditOrder({ order, busy, onSave, onCancel }) {
  const { settings } = useUser();
  const [items, setItems] = useState(null); // the price list, for adding a row and for the price of another service
  const [rows, setRows] = useState(() =>
    order.lines.map((l) => ({
      key: (editKey += 1),
      item: l.item || null,
      name: l.itemName,
      service: l.service || 'wash',
      quantity: String(l.quantity),
      colour: l.colour || '',
      stain: l.stain || '',
      price: String(l.price),
      dateIn: l.dateIn ? dayInputValue(l.dateIn) : '',
      dateOut: l.dateOut ? dayInputValue(l.dateOut) : '',
      remarks: l.remarks || '',
    }))
  );
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate ? dayInputValue(order.deliveryDate) : '');
  const [handover, setHandover] = useState(order.handover || 'pickup');
  const [address, setAddress] = useState(order.deliveryAddress || '');
  const [fee, setFee] = useState(order.deliveryFee > 0 ? String(order.deliveryFee) : '');
  const [rider, setRider] = useState(order.riderName || '');
  const [riderPhone, setRiderPhone] = useState(order.riderPhone || '');
  const [express, setExpress] = useState(Boolean(order.express));
  const [expressPercent, setExpressPercent] = useState(String(order.express && order.expressPercent ? order.expressPercent : settings.preferences.expressPercent));
  const [discountType, setDiscountType] = useState(order.discountType || 'amount');
  const [discountValue, setDiscountValue] = useState(order.discount > 0 ? String(order.discountValue) : '');
  const [notes, setNotes] = useState(order.notes || '');
  const [addId, setAddId] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    listLaundryItems()
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]));
  }, []);

  function update(key, changes) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  }

  // another service has another price: take the one from the list when it is known
  function changeService(row, service) {
    const item = (items || []).find((i) => i._id === row.item);
    const price = item ? servicePrice(item, service) : 0;
    update(row.key, price > 0 ? { service, price: String(price) } : { service });
  }

  function addRow() {
    const item = (items || []).find((i) => i._id === addId);
    if (!item) return;
    setRows((prev) => [
      ...prev,
      { key: (editKey += 1), item: item._id, name: item.name, service: 'wash', quantity: '1', colour: '', stain: '', price: String(item.price), dateIn: '', dateOut: '', remarks: '' },
    ]);
    setAddId('');
  }

  const subtotal = rows.reduce((sum, r) => sum + (Math.floor(Number(r.quantity)) || 0) * (Number(r.price) || 0), 0);
  const sums = laundryTotals({
    subtotal,
    express,
    expressPercent,
    discountType,
    discountValue,
    deliveryFee: handover === 'delivery' ? Number(fee) || 0 : 0,
  });
  const total = sums.total;

  function submit(e) {
    e.preventDefault();
    setProblem('');
    if (rows.length === 0) return setProblem('An order needs at least one item');
    for (const r of rows) {
      const q = Number(r.quantity);
      if (!Number.isInteger(q) || q < 1 || q > 1000) return setProblem(`${r.name}: the quantity must be a whole number of 1 or more`);
      if (!(Number(r.price) >= 0)) return setProblem(`${r.name}: the price cannot be negative`);
    }
    if (express && !(Number(expressPercent) >= 0 && Number(expressPercent) <= 300)) return setProblem('The express charge must be between 0 and 300 percent');
    if (discountValue !== '' && !(Number(discountValue) >= 0)) return setProblem('The discount cannot be negative');
    if (discountValue !== '' && discountType === 'percent' && Number(discountValue) > 100) return setProblem('A discount cannot be more than 100 percent');
    if (sums.tooMuch) return setProblem('The discount is more than the order');
    if (handover === 'delivery' && !address.trim()) return setProblem('Enter the address to deliver to');
    if (total < order.amountPaid) return setProblem(`The customer has already paid ${formatMoney(order.amountPaid)}, so the total cannot be lower than that.`);

    const known = new Set((items || []).map((i) => i._id));
    const lines = rows.map((r) => {
      const line = { quantity: Number(r.quantity), service: r.service, colour: r.colour.trim(), stain: r.stain.trim(), price: Number(r.price) || 0, remarks: r.remarks.trim() };
      // the name the row was written with is always kept (an item renamed later does not change an old order);
      // an item that is no longer in the price list is kept by name only
      line.itemName = r.name;
      if (r.item && known.has(r.item)) line.item = r.item;
      if (r.dateIn) line.dateIn = r.dateIn;
      if (r.dateOut) line.dateOut = r.dateOut;
      return line;
    });
    const payload = {
      lines,
      deliveryDate,
      handover,
      notes,
      express,
      expressPercent: express ? Number(expressPercent) || 0 : 0,
      discountType: Number(discountValue) > 0 ? discountType : '',
      discountValue: Number(discountValue) > 0 ? Number(discountValue) : 0,
    };
    if (handover === 'delivery') {
      payload.deliveryAddress = address.trim();
      payload.deliveryFee = Number(fee) || 0;
      payload.riderName = rider.trim();
      payload.riderPhone = riderPhone.trim();
    }
    onSave(payload);
  }

  return (
    <form onSubmit={submit} className="mb-6 space-y-5">
      <SectionCard title="Edit the items">
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b-2 border-gray-300 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
              <tr>
                <th className="py-2 pr-2">Item</th>
                <th className="w-36 py-2 pr-2">Service</th>
                <th className="w-20 py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Colour / description</th>
                <th className="py-2 pr-2">Stain / special care</th>
                <th className="w-28 py-2 pr-2">Price each</th>
                <th className="w-36 py-2 pr-2">Date in</th>
                <th className="w-36 py-2 pr-2">Date out</th>
                <th className="py-2 pr-2">Remarks</th>
                <th className="w-16 py-2" aria-label="Remove" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2 pr-2 font-medium text-gray-900">
                    <span className="flex items-center gap-2.5">
                      <ClothTile name={r.name} size="sm" />
                      {r.name}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <select value={r.service} onChange={(e) => changeService(r, e.target.value)} aria-label={`Service for ${r.name}`} className={cell}>
                      {SERVICES.map((sv) => (
                        <option key={sv.value} value={sv.value}>
                          {sv.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input type="number" min="1" step="1" value={r.quantity} onChange={(e) => update(r.key, { quantity: e.target.value })} aria-label={`Quantity of ${r.name}`} className={cell} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="text" maxLength={80} value={r.colour} onChange={(e) => update(r.key, { colour: e.target.value })} aria-label="Colour or description" className={cell} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="text" maxLength={120} value={r.stain} onChange={(e) => update(r.key, { stain: e.target.value })} aria-label="Stain or special care" className={cell} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="number" min="0" step="any" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} aria-label="Price each" className={cell} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="date" value={r.dateIn} onChange={(e) => update(r.key, { dateIn: e.target.value })} aria-label="Date in" className={cell} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="date" value={r.dateOut} onChange={(e) => update(r.key, { dateOut: e.target.value })} aria-label="Date out" className={cell} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="text" maxLength={120} value={r.remarks} onChange={(e) => update(r.key, { remarks: e.target.value })} aria-label="Remarks" className={cell} />
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <select value={addId} onChange={(e) => setAddId(e.target.value)} className={`${inputClass} !w-auto min-w-[12rem]`} aria-label="Add an item from your list">
            <option value="">{items === null ? 'Loading…' : 'Add an item from your list'}</option>
            {(items || []).map((i) => (
              <option key={i._id} value={i._id}>
                {i.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={addRow} disabled={!addId} className={secondaryButtonClass}>
            Add row
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Express, discount and hand-over">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-800">
                <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Express / same-day
              </label>
              {express && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>Extra charge</span>
                  <input type="number" min="0" max="300" step="any" value={expressPercent} onChange={(e) => setExpressPercent(e.target.value)} aria-label="Express charge in percent" className={`${cell} !w-20`} />
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
                <input type="number" min="0" step="any" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0" aria-label="Discount" className={`${cell} !w-28`} />
                {sums.discount > 0 && <span className="tabular ml-auto text-sm font-medium text-green-700">−{formatMoney(sums.discount)}</span>}
              </div>
              {sums.tooMuch && <p className="mt-2 text-xs text-red-600">The discount is more than the order.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date out (promised)">
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Hand-over">
              <select value={handover} onChange={(e) => setHandover(e.target.value)} className={inputClass}>
                <option value="pickup">Pick-up</option>
                <option value="delivery">Delivery</option>
              </select>
            </Field>
            {handover === 'delivery' && (
              <Field label="Delivery fee (₦)">
                <input type="number" min="0" step="any" value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} />
              </Field>
            )}
          </div>
          {handover === 'delivery' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Field label="Delivery address">
                  <input type="text" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="Rider's name">
                <input type="text" maxLength={60} value={rider} onChange={(e) => setRider(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Rider's phone">
                <input type="tel" maxLength={30} value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}
          <Field label="Notes">
            <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 text-sm ring-1 ring-primary/15">
          <span className="text-gray-600">New total</span>
          <span className="tabular text-lg font-semibold text-gray-900">{formatMoney(total)}</span>
        </div>
        {problem && <p className="mt-3 text-sm text-red-600">{problem}</p>}
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Cancel
          </button>
        </div>
      </SectionCard>
    </form>
  );
}
