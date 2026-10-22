'use client';

import { useRef, useState } from 'react';
import { addLaundryPayment, setLaundryStatus, updateLaundryOrder } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { newClientId } from '@/lib/outbox';
import { isDelivery, stepsFor, whatsappMessage, whatsappUrlFor } from '@/lib/laundry';
import { Icon } from '@/components/Icons';
import { useUser } from '@/components/UserProvider';
import { HistoryList, PaymentMethodSelect } from '@/components/JobParts';
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

// The "Progress" card of a laundry order: where the order is, the one thing to do next, and the questions that go with it
// (will it be picked up or delivered, who is the rider, how was the balance paid). `act` is the page's helper that runs a
// request, shows the answer and keeps the page's copy of the order up to date.
export default function LaundryProgress({ order, canWrite, busy, act, businessName, onOrder }) {
  const [panel, setPanel] = useState(null); // 'ready' | 'handover' | 'out' | 'done'
  const delivery = isDelivery(order);
  const steps = stepsFor(order);
  const index = steps.findIndex((s) => s.value === order.status);
  const open = order.status !== 'collected';
  const label = (value) => steps.find((s) => s.value === value)?.label || value;
  const previous = index > 0 ? steps[index - 1] : null;

  const close = () => setPanel(null);
  const go = (status, extra, message) =>
    act(() => setLaundryStatus(order._id, status, undefined, extra), message || `Marked "${label(status)}"`).then((ok) => {
      if (ok) close();
      return ok;
    });

  const wa = whatsappMessage(order, businessName);

  return (
    <div>
      <ol className="mb-5 flex items-start" aria-label="Progress of the order">
        {steps.map((s, i) => {
          const done = i < index || order.status === 'collected';
          const current = i === index && order.status !== 'collected';
          return (
            <li key={s.value} className="flex min-w-0 flex-1 flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : done || current ? 'bg-primary' : 'bg-gray-200'}`} />
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? 'bg-primary text-white' : current ? 'bg-primary text-white ring-4 ring-primary/30' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'bg-transparent' : done ? 'bg-primary' : 'bg-gray-200'}`} />
              </div>
              <span className={`mt-1.5 px-1 text-xs leading-tight ${current ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {canWrite && open ? (
        <>
          {panel === null && (
            <div className="flex flex-wrap items-center gap-2">
              {order.status === 'received' && (
                <>
                  <button type="button" disabled={busy} onClick={() => go('processing')} className={primaryButtonClass}>
                    Start washing
                  </button>
                  <button type="button" disabled={busy} onClick={() => setPanel('ready')} className={secondaryButtonClass}>
                    It is already ready…
                  </button>
                </>
              )}
              {order.status === 'processing' && (
                <button type="button" disabled={busy} onClick={() => setPanel('ready')} className={primaryButtonClass}>
                  Mark ready…
                </button>
              )}
              {order.status === 'ready' && !delivery && (
                <>
                  <button type="button" disabled={busy} onClick={() => setPanel('done')} className={primaryButtonClass}>
                    Customer collected it…
                  </button>
                  <button type="button" disabled={busy} onClick={() => setPanel('handover')} className={secondaryButtonClass}>
                    Deliver it instead…
                  </button>
                </>
              )}
              {order.status === 'ready' && delivery && (
                <>
                  <button type="button" disabled={busy} onClick={() => setPanel('out')} className={primaryButtonClass}>
                    Send out for delivery…
                  </button>
                  <button type="button" disabled={busy} onClick={() => setPanel('handover')} className={secondaryButtonClass}>
                    Change the delivery…
                  </button>
                </>
              )}
              {order.status === 'out_for_delivery' && (
                <button type="button" disabled={busy} onClick={() => setPanel('done')} className={primaryButtonClass}>
                  Mark delivered…
                </button>
              )}
              {previous && (
                <button type="button" disabled={busy} onClick={() => go(previous.value)} className="px-2 py-2 text-sm text-gray-500 hover:text-gray-800 hover:underline">
                  ← Back to &ldquo;{previous.label}&rdquo;
                </button>
              )}
            </div>
          )}

          {panel === 'ready' && <ReadyPanel order={order} busy={busy} onCancel={close} onSubmit={(fields) => go('ready', fields, 'Marked ready')} />}
          {panel === 'handover' && (
            <ReadyPanel
              order={order}
              busy={busy}
              switching
              onCancel={close}
              onSubmit={(fields) => act(() => updateLaundryOrder(order._id, fields), fields.handover === 'delivery' ? 'Changed to delivery' : 'Changed to pick-up').then((ok) => ok && close())}
            />
          )}
          {panel === 'out' && <OutPanel order={order} busy={busy} onCancel={close} onSubmit={(fields) => go('out_for_delivery', fields, `Out for delivery with ${fields.riderName}`)} />}
          {panel === 'done' && <DonePanel order={order} busy={busy} delivery={delivery} onCancel={close} act={act} onOrder={onOrder} onDone={close} />}

          {order.balance > 0 && panel === null && (
            <p className="mt-3 text-xs text-gray-500">The customer still owes {formatMoney(order.balance)}. {delivery ? 'The rider can collect it, or take it here first.' : 'Record their payment below before the clothes go back.'}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-600">
          {open ? 'You can look at this order but not change it.' : `${delivery ? 'Delivered' : 'Collected'} on ${formatDateTime(order.collectedAt)}. A finished order is final.`}
        </p>
      )}

      {canWrite && (
        <div className="mt-4">
          <a
            href={whatsappUrlFor(order, businessName)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3.5 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100"
          >
            <Icon name="send" className="h-4 w-4" />
            {wa.label} on WhatsApp
          </a>
        </div>
      )}

      <div className="mt-5 border-t border-gray-100 pt-4">
        <HistoryList history={order.history} statuses={steps} />
      </div>
    </div>
  );
}

function PanelBox({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <p className="mb-3 text-sm font-semibold text-gray-900">{title}</p>
      {children}
    </div>
  );
}

function HandoverChoice({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="radiogroup" aria-label="How will the customer get the clothes back?">
      {[
        { value: 'pickup', label: 'Pick-up' },
        { value: 'delivery', label: 'Delivery' },
      ].map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-md px-5 py-1.5 text-sm transition focus-within:ring-2 focus-within:ring-primary ${
            value === o.value ? 'bg-primary font-medium text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <input type="radio" name="ready-handover" checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// "Ready": and, at the same moment, will the customer come for it or do we take it to them?
// With `switching` it only changes that (the order's status stays as it is).
function ReadyPanel({ order, busy, switching, onCancel, onSubmit }) {
  const [handover, setHandover] = useState(switching ? (order.handover === 'delivery' ? 'pickup' : 'delivery') : order.handover || 'pickup');
  const [address, setAddress] = useState(order.deliveryAddress || order.customerAddress || '');
  const [fee, setFee] = useState(order.deliveryFee > 0 ? String(order.deliveryFee) : '');
  const [problem, setProblem] = useState('');

  function submit(e) {
    e.preventDefault();
    setProblem('');
    if (handover === 'delivery' && !address.trim()) return setProblem('Enter the address to deliver to');
    if (handover === 'delivery' && fee !== '' && !(Number(fee) >= 0)) return setProblem('The delivery fee cannot be negative');
    const fields = { handover };
    if (handover === 'delivery') {
      fields.deliveryAddress = address.trim();
      fields.deliveryFee = Number(fee) || 0;
    }
    // (an order that is already for pick-up and stays so has nothing to change)
    if (switching && handover === (order.handover || 'pickup')) return onCancel();
    return onSubmit(fields);
  }

  return (
    <form onSubmit={submit}>
      <PanelBox title={switching ? 'Change how the customer gets the clothes' : 'Mark ready: how will the customer get the clothes?'}>
        <div className="space-y-4">
          <HandoverChoice value={handover} onChange={setHandover} />
          {handover === 'delivery' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
              <Field label="Deliver to">
                <input type="text" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Delivery fee (₦)" hint={order.deliveryFee > 0 ? undefined : 'Added to the total'}>
                <input type="number" min="0" step="any" value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}
          {problem && <p className="text-sm text-red-600">{problem}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? 'Saving…' : switching ? 'Save' : handover === 'delivery' ? 'Ready for delivery' : 'Ready for pick-up'}
            </button>
            <button type="button" onClick={onCancel} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      </PanelBox>
    </form>
  );
}

// "Out for delivery": who is taking it
function OutPanel({ order, busy, onCancel, onSubmit }) {
  const [rider, setRider] = useState(order.riderName || '');
  const [riderPhone, setRiderPhone] = useState(order.riderPhone || '');
  const [address, setAddress] = useState(order.deliveryAddress || '');
  const [fee, setFee] = useState(order.deliveryFee > 0 ? String(order.deliveryFee) : '');
  const [problem, setProblem] = useState('');

  function submit(e) {
    e.preventDefault();
    setProblem('');
    if (!rider.trim()) return setProblem('Enter the name of the rider taking this order');
    if (!address.trim()) return setProblem('Enter the address to deliver to');
    return onSubmit({ handover: 'delivery', riderName: rider.trim(), riderPhone: riderPhone.trim(), deliveryAddress: address.trim(), deliveryFee: Number(fee) || 0 });
  }

  return (
    <form onSubmit={submit}>
      <PanelBox title="Send out for delivery">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Rider's name">
              <input type="text" maxLength={60} value={rider} onChange={(e) => setRider(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Rider's phone (optional)">
              <input type="tel" maxLength={30} value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
            <Field label="Deliver to">
              <input type="text" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Delivery fee (₦)">
              <input type="number" min="0" step="any" value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} />
            </Field>
          </div>
          {problem && <p className="text-sm text-red-600">{problem}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? 'Saving…' : 'Out for delivery'}
            </button>
            <button type="button" onClick={onCancel} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      </PanelBox>
    </form>
  );
}

// "Delivered" / "Collected": the clothes can only go when everything is paid, so any balance is taken here (the rider's cash, say).
function DonePanel({ order, busy, delivery, onCancel, act, onOrder, onDone }) {
  const { settings } = useUser();
  const balance = order.balance > 0 ? order.balance : 0;
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : '');
  const [method, setMethod] = useState(settings.preferences.defaultPaymentMethod);
  const [problem, setProblem] = useState('');
  // this payment's own id, so a second tap or a retry never takes the money twice
  const paymentKey = useRef(null);
  const word = delivery ? 'delivered' : 'handed over';

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    if (balance > 0 && !(Number(amount) >= balance)) return setProblem(`The whole balance of ${formatMoney(balance)} must be paid before the order is closed.`);
    if (balance > 0 && Number(amount) > balance) return setProblem(`That is more than the balance of ${formatMoney(balance)}`);
    const ok = await act(async () => {
      if (balance > 0) {
        if (!paymentKey.current) paymentKey.current = newClientId();
        const paid = await addLaundryPayment(order._id, { amount: balance, method, paymentKey: paymentKey.current });
        if (paid && paid.order) {
          // show the payment at once, even if the next step fails
          if (onOrder) onOrder(paid.order);
        }
      }
      return setLaundryStatus(order._id, 'collected');
    }, `Marked ${word}`);
    if (ok) onDone();
  }

  return (
    <form onSubmit={submit}>
      <PanelBox title={delivery ? 'Mark delivered' : 'Customer collected the clothes'}>
        <div className="space-y-4">
          {balance > 0 ? (
            <>
              <p className="text-sm text-gray-700">
                The customer still owes <span className="font-semibold text-red-600">{formatMoney(balance)}</span>. Record what {delivery ? 'the rider collected' : 'they paid'} to close the order.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Amount received (₦)">
                  <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Paid by">
                  <PaymentMethodSelect value={method} onChange={setMethod} />
                </Field>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700">Everything is paid. Confirm that the clothes have been {word}.</p>
          )}
          {problem && <p className="text-sm text-red-600">{problem}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? 'Saving…' : balance > 0 ? `Record payment and mark ${word}` : `Mark ${word}`}
            </button>
            <button type="button" onClick={onCancel} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      </PanelBox>
    </form>
  );
}
