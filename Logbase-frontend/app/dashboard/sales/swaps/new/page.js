'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listProducts, createSale, availableSerials } from '@/lib/api';
import { forShop, getActiveShopId } from '@/lib/shopStorage';
import { formatMoney, variantLabel } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { newClientId } from '@/lib/outbox';
import { warrantyLabel } from '@/lib/serials';
import { saveErrorMessage } from '@/lib/jobs';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import SalePhotosPicker from '@/components/SalePhotosPicker';
import SerialsInput from '@/components/SerialsInput';
import CustomerPicker, { useCustomerPicker } from '@/components/CustomerPicker';
import { PaymentMethodSelect } from '@/components/JobParts';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';
import Avatar from '@/components/Avatar';

const CONDITIONS = ['Like new', 'Good', 'Fair', 'Cracked screen', 'Faulty'];

// A swap: the customer hands in an old item, it is valued, and the value is taken off the price of the new item.
// LogBase works out what the customer still has to add (or what you give back if the old item is worth more).
export default function NewSwapPage() {
  const router = useRouter();
  const { user, settings } = useUser();
  const picker = useCustomerPicker();

  const [products, setProducts] = useState([]);
  const [onShelf, setOnShelf] = useState({});
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [serials, setSerials] = useState([]);
  const [warrantyMonths, setWarrantyMonths] = useState('');

  const [oldItem, setOldItem] = useState('');
  const [oldImei, setOldImei] = useState('');
  const [oldCondition, setOldCondition] = useState('');
  const [oldValue, setOldValue] = useState('');

  const [paidInFull, setPaidInFull] = useState(true);
  const [cashPaid, setCashPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(settings.preferences.defaultPaymentMethod);
  const [photos, setPhotos] = useState([]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // this swap's own id: kept while the form is filled in and retried, so a try that reached the server is not recorded twice
  const swapId = useRef(null);

  useEffect(() => {
    listProducts()
      .then((data) => setProducts(forShop(data.products || [])))
      .catch((err) => setError(err.message));
  }, []);

  const product = products.find((p) => p._id === productId);
  const variants = product?.variants || [];
  const variant = variants.find((v) => v._id === variantId);
  const tracked = Boolean(product?.tracksSerials);
  const available = product ? (variants.length > 0 ? (variant ? variant.quantity : 0) : product.quantity) : 0;

  function priceFor(p, v) {
    if (v && v.sellingPrice != null) return v.sellingPrice;
    return p ? p.sellingPrice : '';
  }

  function handleProductChange(id) {
    const p = products.find((x) => x._id === id);
    setProductId(id);
    setVariantId('');
    setSerials([]);
    setQuantity('1');
    setWarrantyMonths('');
    setUnitPrice(p ? priceFor(p, null) : '');
    if (p?.tracksSerials && !onShelf[id]) {
      // suggestions only: if this fails the person can still type the number
      availableSerials(id)
        .then((data) => setOnShelf((prev) => ({ ...prev, [id]: data.serials || [] })))
        .catch(() => {});
    }
  }

  function handleVariantChange(id) {
    const v = variants.find((x) => x._id === id);
    setVariantId(id);
    setSerials([]);
    if (v) setUnitPrice(priceFor(product, v));
  }

  // ---- the money, worked out live ----
  const units = tracked ? serials.length : Math.max(Math.floor(Number(quantity)) || 0, 0);
  const price = Number(unitPrice) || 0;
  const newTotal = Math.round(units * price * 100) / 100;
  const value = Number(oldValue) || 0;
  const credit = Math.min(value, newTotal);
  const topUp = Math.round((newTotal - credit) * 100) / 100; // what the customer adds
  const giveBack = newTotal > 0 ? Math.round(Math.max(value - newTotal, 0) * 100) / 100 : 0; // when the old item is worth more
  const cash = paidInFull ? topUp : Math.min(Math.max(Number(cashPaid) || 0, 0), topUp);
  const stillOwed = Math.round((topUp - cash) * 100) / 100;
  const ready = newTotal > 0 && value > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!product) return setError('Choose the new item the customer is taking');
    if (variants.length > 0 && !variant) return setError(`Choose the colour / size of ${product.name}`);
    if (tracked && serials.length !== 1) return setError(`Enter the IMEI / serial number of the ${product.name} being sold`);
    if (!tracked && units < 1) return setError('Enter a quantity of 1 or more');
    if (units > available) return setError(`Only ${available} of this item in stock`);
    if (!(price >= 0) || unitPrice === '') return setError('Enter the price of the new item');
    if (!oldItem.trim()) return setError('Say what the customer is handing in (for example: iPhone XR 64GB)');
    if (!(value > 0)) return setError('Enter how much the item handed in is worth');
    if (!paidInFull && Number(cashPaid) > topUp) return setError(`The customer only has ${formatMoney(topUp)} to add`);
    const problem = picker.problem();
    if (problem) return setError(problem);

    if (!swapId.current) swapId.current = newClientId();

    const item = { product: product._id, quantity: units, unitPrice: price };
    if (variant) item.variant = variant._id;
    if (tracked) item.serials = serials;
    if (warrantyMonths !== '') item.warrantyMonths = Number(warrantyMonths);

    setSaving(true);
    try {
      const customer = await picker.resolve();
      const data = await createSale(
        {
          items: [item],
          shop: getActiveShopId() || undefined,
          tradeIn: { description: oldItem.trim(), imei: oldImei.trim(), condition: oldCondition.trim(), value },
          amountPaid: cash, // the cash the customer paid towards the top-up
          paymentMethod,
          deliveryPaidByUs: false,
          deliveryCost: 0,
          clientId: swapId.current,
          customer: customer._id,
          customerName: customer.name,
        },
        photos
      );
      notifySuccess('Swap recorded', giveBack > 0 ? `Give ${customer.name} ${formatMoney(giveBack)}` : `${customer.name} added ${formatMoney(cash)}`);
      router.push(data.sale?._id ? `/dashboard/sales/${data.sale._id}` : '/dashboard/sales/swaps');
    } catch (err) {
      setError(saveErrorMessage(err, 'swap'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="New item swap"
        subtitle="The customer hands in an old item and takes a new one. LogBase works out what they must add."
        backHref="/dashboard/sales/swaps"
        backLabel="Back to swaps"
      />

      <ErrorBanner message={error || picker.loadError} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4 p-6`}>
        {/* 1. the old item */}
        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">1. Item handed in by the customer</p>
          <Field label="What is it?" hint="For example: iPhone XR 64GB, Samsung A14, Tecno Spark 10.">
            <input type="text" maxLength={120} value={oldItem} onChange={(e) => setOldItem(e.target.value)} className={inputClass} required />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="IMEI / serial (optional)">
              <input type="text" maxLength={40} value={oldImei} onChange={(e) => setOldImei(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Condition (optional)">
              <input type="text" list="swap-conditions" maxLength={80} value={oldCondition} onChange={(e) => setOldCondition(e.target.value)} className={inputClass} />
              <datalist id="swap-conditions">
                {CONDITIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="What you value it at (₦)" hint="This amount is taken off the price of the new item.">
            <input type="number" min="0" step="any" value={oldValue} onChange={(e) => setOldValue(e.target.value)} className={inputClass} required />
          </Field>
        </div>

        {/* 2. the new item */}
        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">2. New item the customer takes</p>
          <Field label="Product">
            <select value={productId} onChange={(e) => handleProductChange(e.target.value)} className={inputClass} required>
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} — {p.quantity} in stock
                </option>
              ))}
            </select>
          </Field>

          {product && variants.length > 0 && (
            <Field label="Colour / size">
              <select value={variantId} onChange={(e) => handleVariantChange(e.target.value)} className={inputClass} required>
                <option value="">Select one</option>
                {variants.map((v) => (
                  <option key={v._id} value={v._id} disabled={v.quantity <= 0}>
                    {variantLabel(v)} — {v.quantity <= 0 ? 'out of stock' : `${v.quantity} in stock`}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {product && available <= 0 && (variants.length === 0 || variant) && (
            <p className="text-xs text-red-600">This item is out of stock.</p>
          )}

          {product && tracked && (variants.length === 0 || variant) && (
            <Field label="IMEI / serial number" hint="Scan it or type it, then press Enter.">
              <SerialsInput value={serials} onChange={(list) => setSerials(list.slice(0, 1))} suggestions={onShelf[product._id] || []} />
            </Field>
          )}

          {product && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!tracked && (
                <Field label="Quantity">
                  <input type="number" min="1" max={available > 0 ? available : undefined} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} required />
                </Field>
              )}
              <Field label="Price (₦)">
                <input type="number" min="0" step="any" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputClass} required />
              </Field>
            </div>
          )}

          {product && (
            <Field label="Warranty (months)" hint={`Leave empty for the usual warranty (${warrantyLabel(product.warrantyMonths).toLowerCase()}). Type 0 for none.`}>
              <input
                type="number"
                min="0"
                max="120"
                step="1"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder={String(product.warrantyMonths || 0)}
                className={`${inputClass} sm:max-w-[10rem]`}
              />
            </Field>
          )}
        </div>

        {/* what it comes to, live */}
        <div className="rounded-xl bg-primary/5 p-4 text-sm ring-1 ring-primary/15" aria-live="polite">
          <div className="flex items-center justify-between py-1 text-gray-600">
            <span>New item</span>
            <span className="tabular font-medium text-gray-900">{formatMoney(newTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-gray-600">
            <span>Less: item handed in</span>
            <span className="tabular font-medium text-gray-900">-{formatMoney(value)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-primary/15 pt-3">
            {giveBack > 0 ? (
              <>
                <span className="font-medium text-gray-900">You give the customer back</span>
                <span className="tabular text-xl font-semibold text-amber-700">{formatMoney(giveBack)}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-gray-900">Customer must add</span>
                <span className="tabular text-xl font-semibold text-gray-900">{formatMoney(ready ? topUp : 0)}</span>
              </>
            )}
          </div>
          {giveBack > 0 && <p className="mt-2 text-xs text-gray-500">The old item is worth more than the new one, so you pay the difference out.</p>}
        </div>

        {/* paying the top-up */}
        {topUp > 0 && (
          <>
            <Field label="Top-up paid by">
              <PaymentMethodSelect value={paymentMethod} onChange={setPaymentMethod} />
            </Field>
            <div className="flex items-center gap-2">
              <input id="topUpFull" type="checkbox" checked={paidInFull} onChange={(e) => setPaidInFull(e.target.checked)} />
              <label htmlFor="topUpFull" className="text-sm text-gray-700">
                Customer paid the full top-up ({formatMoney(topUp)})
              </label>
            </div>
            {!paidInFull && (
              <Field label="Amount paid now (₦)" hint={stillOwed > 0 ? `${formatMoney(stillOwed)} will be added to what this customer owes.` : undefined}>
                <input type="number" min="0" step="any" max={topUp} value={cashPaid} onChange={(e) => setCashPaid(e.target.value)} className={inputClass} />
              </Field>
            )}
          </>
        )}

        <Field label="Photos" hint="The old item, the new item, the customer… (optional).">
          <SalePhotosPicker files={photos} onChange={setPhotos} disabled={saving} />
        </Field>

        <CustomerPicker picker={picker} savedNote="They will be saved automatically with this swap." />

        <p className="flex items-center gap-2 text-sm text-gray-500">
          Recorded by
          <Avatar name={user.name} photoUrl={user.photoUrl} size="xs" />
          <span className="font-medium text-gray-700">{user.name}</span>
        </p>

        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5`}>
          {saving ? 'Recording…' : 'Record swap'}
        </button>
      </form>
    </div>
  );
}
