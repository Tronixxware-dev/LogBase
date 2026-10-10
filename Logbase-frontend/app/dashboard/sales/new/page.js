'use client';

import { notifySuccess } from '@/lib/feedback';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listProducts, listCustomers, createCustomer, createSale, availableSerials } from '@/lib/api';
import { formatMoney, variantLabel } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import { SYNC_NOW_EVENT } from '@/components/OfflineStatus';
import { applyLocalStock, describeSale, newClientId, queueSale, takeOffStock } from '@/lib/outbox';
import PageHeader from '@/components/PageHeader';
import PhoneInput from '@/components/PhoneInput';
import SalePhotosPicker from '@/components/SalePhotosPicker';
import SerialsInput from '@/components/SerialsInput';
import { warrantyLabel } from '@/lib/serials';
import { DEFAULT_COUNTRY, parsePhone, phoneKey } from '@/lib/phone';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';
import Avatar from '@/components/Avatar';

let lineCounter = 0;

// One product being sold. Products with colours / sizes keep a quantity (and price) per colour
// in `picks`, so several colours can be sold at once. Plain products use quantity / unitPrice.
function newLine(productId = '') {
  lineCounter += 1;
  // serials: the IMEI / serial numbers when the product is tracked (plain products); with colours they live in each pick.
  // warrantyMonths: '' means the product's own default warranty.
  return { key: lineCounter, productId, quantity: 1, unitPrice: '', picks: {}, serials: [], warrantyMonths: '' };
}

export default function NewSalePage() {
  const router = useRouter();
  const { user } = useUser(); // every sale is recorded under the name of whoever is signed in
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  // One line per product colour / size being sold. A customer can buy several at once.
  const [lines, setLines] = useState([newLine()]);
  const [customerName, setCustomerName] = useState('');
  const [fullPayment, setFullPayment] = useState(true);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // Does the business pay for the delivery? "No" means the customer pays and there is nothing to record.
  const [deliveryPaidByUs, setDeliveryPaidByUs] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_COUNTRY);
  const [customerPhone, setCustomerPhone] = useState('');
  const [photos, setPhotos] = useState([]);
  const [customerAddress, setCustomerAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // set when a sale was saved on this phone because there was no connection: { customerName, total }
  const [savedOffline, setSavedOffline] = useState(null);
  // This sale's own id and the time it was made. Kept while the form is being filled in and retried, so a try that
  // reached the server but lost its answer is recognised (and not recorded twice) when the person presses Record again.
  const saleId = useRef(null);
  const madeAt = useRef(null);
  // the IMEI / serial numbers on the shelf for each tracked product (offered while typing)
  const [onShelf, setOnShelf] = useState({});

  useEffect(() => {
    Promise.all([listProducts(), listCustomers()])
      .then(([productsData, customersData]) => {
        setProducts(productsData.products || []);
        setCustomers(customersData.customers || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  // The phone number finds the customer: a known number picks the saved customer,
  // an unknown number means a new customer, who is saved automatically with the sale.
  // How many digits are needed depends on the country code chosen.
  const parsedPhone = parsePhone(phoneCountry, customerPhone);
  const matchedCustomer = parsedPhone.valid ? customers.find((b) => phoneKey(b.phone) === parsedPhone.key) : null;
  const isNewCustomer = parsedPhone.valid && !matchedCustomer;

  function productOf(line) {
    return products.find((p) => p._id === line.productId);
  }

  // A variant can have its own price; otherwise the product's price applies.
  function priceFor(product, variant) {
    if (variant && variant.sellingPrice != null) return variant.sellingPrice;
    return product ? product.sellingPrice : '';
  }

  // What this line is selling, as one entry per colour / size (or one entry for a plain product).
  function itemsOf(line) {
    const product = productOf(line);
    if (!product) return [];
    // a tracked product sells one unit per IMEI / serial number, so the quantity is the number of numbers entered
    const warranty = line.warrantyMonths === '' ? undefined : Number(line.warrantyMonths);
    if (product.variants?.length > 0) {
      return product.variants
        .map((v) => {
          const pick = line.picks[v._id];
          const serials = product.tracksSerials ? pick?.serials || [] : undefined;
          return {
            product: product._id,
            variant: v._id,
            quantity: serials ? serials.length : Number(pick?.quantity) || 0,
            unitPrice: pick?.unitPrice !== undefined && pick.unitPrice !== '' ? Number(pick.unitPrice) : Number(priceFor(product, v)) || 0,
            serials,
            warrantyMonths: warranty,
          };
        })
        .filter((item) => item.quantity > 0);
    }
    const serials = product.tracksSerials ? line.serials : undefined;
    return [
      {
        product: product._id,
        quantity: serials ? serials.length : Number(line.quantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        serials,
        warrantyMonths: warranty,
      },
    ];
  }

  const grandTotal = lines.reduce(
    (sum, l) => sum + itemsOf(l).reduce((s, item) => s + item.quantity * item.unitPrice, 0),
    0
  );

  function updateLine(key, changes) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  function handleProductChange(key, id) {
    const product = products.find((p) => p._id === id);
    updateLine(key, {
      productId: id,
      picks: {},
      quantity: 1,
      serials: [],
      warrantyMonths: '',
      unitPrice: product ? priceFor(product, null) : '',
    });
    if (product?.tracksSerials && !onShelf[id]) {
      // suggestions only: if this fails the person can still type the numbers
      availableSerials(id)
        .then((data) => setOnShelf((prev) => ({ ...prev, [id]: data.serials || [] })))
        .catch(() => {});
    }
  }

  function updatePick(line, variantId, changes) {
    updateLine(line.key, {
      picks: { ...line.picks, [variantId]: { ...line.picks[variantId], ...changes } },
    });
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(key) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const items = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const product = productOf(line);
      const where = lines.length > 1 ? ` (product ${i + 1})` : '';
      if (!product) {
        setError(`Choose a product${where}`);
        return;
      }
      const lineItems = itemsOf(line).filter((item) => item.quantity > 0);
      if (lineItems.length === 0) {
        setError(
          product.variants?.length > 0
            ? product.tracksSerials
              ? `Enter the IMEI / serial number of each ${product.name} being sold`
              : `Enter a quantity for at least one colour / size of ${product.name}`
            : product.tracksSerials
              ? `Enter the IMEI / serial number of each ${product.name} being sold${where}`
              : `Enter a quantity${where}`
        );
        return;
      }
      items.push(...lineItems);
    }

    const paid = fullPayment ? grandTotal : Number(amountPaid) || 0;

    if (deliveryPaidByUs && !(Number(deliveryCost) > 0)) {
      setError('Enter how much you paid for the delivery, or choose No if the customer pays for it');
      return;
    }
    if (!parsedPhone.valid) {
      setError(parsedPhone.message);
      return;
    }
    if (isNewCustomer && !customerName.trim()) {
      setError('This phone number is new. Enter the customer name so they can be saved.');
      return;
    }

    if (!saleId.current) saleId.current = newClientId();
    if (!madeAt.current) madeAt.current = new Date().toISOString();
    const clientId = saleId.current;

    const payload = {
      items,
      amountPaid: paid,
      paymentMethod,
      deliveryPaidByUs,
      deliveryCost: deliveryPaidByUs ? Number(deliveryCost) : 0,
    };
    const newCustomer = matchedCustomer
      ? null
      : { name: customerName.trim(), phone: parsedPhone.e164, address: customerAddress.trim() || undefined };
    let customer = matchedCustomer; // becomes the saved customer once the server has them

    setSaving(true);
    setSavedOffline(null);
    try {
      // A new phone number becomes a saved customer first, so the sale is linked to them.
      if (!customer) {
        const created = await createCustomer(newCustomer);
        customer = created.customer;
        // now known, so trying again finds them instead of saving them twice
        setCustomers((prev) => [...prev, customer]);
      }

      // The photos travel with the sale, so the sale and its photos are saved together.
      await createSale(
        { ...payload, clientId, customer: customer._id, customerName: customer.name },
        photos
      );

      notifySuccess('Sale recorded', customer && customer.name ? `Sold to ${customer.name}` : 'Your sale is saved');
      router.push('/dashboard/sales');
    } catch (err) {
      if (err.offline) {
        // No connection (or the server did not answer in time): keep the sale on this phone and send it later.
        // It carries the same id as the try above, so if that try did reach the server it is not recorded twice.
        try {
          const summary = describeSale(payload, products, customer ? customer.name : newCustomer.name);
          await queueSale({
            user,
            clientId,
            madeAt: madeAt.current,
            payload,
            photos,
            customer: customer ? { _id: customer._id, name: customer.name } : null,
            newCustomer: customer ? null : newCustomer,
            summary,
          });
          applyLocalStock(items);
          setProducts((prev) => takeOffStock(prev, items));
          setSavedOffline({ customerName: summary.customerName, total: summary.total });
          notifySuccess('Saved on this phone', 'It will be sent when you are back online');
          resetForm();
          // the confirmation is at the top of the page; the person is looking at the Record button at the bottom
          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch {
            // scrolling is only a convenience
          }
          window.dispatchEvent(new Event(SYNC_NOW_EVENT));
        } catch {
          setError('There is no connection, and this phone could not keep the sale either. Nothing was saved; free some space or try again when you are online.');
        }
      } else {
        // the server answered "no", so nothing was recorded: the next try is a fresh attempt at the current time
        madeAt.current = null;
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  // ready for the next sale
  function resetForm() {
    saleId.current = null;
    madeAt.current = null;
    setLines([newLine()]);
    setCustomerName('');
    setFullPayment(true);
    setAmountPaid('');
    setPaymentMethod('cash');
    setDeliveryPaidByUs(false);
    setDeliveryCost('');
    setCustomerPhone('');
    setPhotos([]);
    setCustomerAddress('');
    setError('');
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Record a sale"
        subtitle="The date and time are saved automatically. Pick as many colours or products as the customer bought."
        backHref="/dashboard/sales"
        backLabel="Back to sales"
      />

      <ErrorBanner message={error} />

      {savedOffline && (
        <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            Saved on this phone: {savedOffline.customerName} — {formatMoney(savedOffline.total)}
          </p>
          <p className="mt-1 text-xs">
            There is no connection right now, so this sale will be sent automatically when you are back online. You can keep
            recording sales.{' '}
            <Link href="/dashboard/sales/pending" className="font-medium underline">
              See saved sales
            </Link>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4 p-6`}>
        {lines.map((line, index) => {
          const product = productOf(line);
          const variants = product?.variants || [];
          const lineTotal = itemsOf(line).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
          const plainAvailable = product?.quantity;
          const cover = product?.images?.find((img) => img.isCover) || product?.images?.[0];

          return (
            <div key={line.key} className="space-y-4 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  {lines.length > 1 ? `Product ${index + 1}` : 'Product sold'}
                </p>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <Field label="Product">
                <select
                  value={line.productId}
                  onChange={(e) => handleProductChange(line.key, e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option
                      key={p._id}
                      value={p._id}
                      disabled={p._id !== line.productId && lines.some((l) => l.productId === p._id)}
                    >
                      {p.name} — {p.quantity} in stock
                    </option>
                  ))}
                </select>
              </Field>

              {product && (
                <div className="flex items-center gap-3">
                  {cover ? (
                    <img
                      src={cover.url}
                      alt={product.name}
                      className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
                      No photo
                    </div>
                  )}
                  <p className="text-sm text-gray-600">{product.name}</p>
                </div>
              )}

              {product && variants.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">Colours / sizes sold</p>
                  <p className="mb-2 text-xs text-gray-400">
                    Type how many of each colour the customer bought. Leave the others empty.
                  </p>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {variants.map((v) => {
                      const pick = line.picks[v._id] || {};
                      const outOfStock = v.quantity <= 0;
                      const tracked = Boolean(product.tracksSerials);
                      const qty = tracked ? (pick.serials || []).length : Number(pick.quantity) || 0;
                      const price = pick.unitPrice !== undefined && pick.unitPrice !== '' ? pick.unitPrice : priceFor(product, v);
                      return (
                        <div
                          key={v._id}
                          className={`grid grid-cols-[1fr_5rem_7rem] items-center gap-2 p-3 ${outOfStock ? 'opacity-50' : ''}`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{variantLabel(v)}</p>
                            <p className={`text-xs ${outOfStock ? 'text-red-600' : 'text-gray-400'}`}>
                              {outOfStock ? 'Out of stock' : `${v.quantity} in stock`}
                            </p>
                          </div>
                          {tracked ? (
                            <p className="text-center text-sm font-medium text-gray-700" aria-label={`Quantity of ${variantLabel(v)}`}>
                              {qty} <span className="text-xs font-normal text-gray-400">units</span>
                            </p>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max={v.quantity}
                              placeholder="Qty"
                              disabled={outOfStock}
                              value={pick.quantity ?? ''}
                              onChange={(e) => updatePick(line, v._id, { quantity: e.target.value })}
                              className={inputClass}
                              aria-label={`Quantity of ${variantLabel(v)}`}
                            />
                          )}
                          <input
                            type="number"
                            min="0"
                            placeholder="Price ₦"
                            disabled={outOfStock}
                            value={price}
                            onChange={(e) => updatePick(line, v._id, { unitPrice: e.target.value })}
                            className={inputClass}
                            aria-label={`Unit price of ${variantLabel(v)}`}
                          />
                          {tracked && !outOfStock && (
                            <div className="col-span-3">
                              <SerialsInput
                                value={pick.serials || []}
                                onChange={(serials) => updatePick(line, v._id, { serials })}
                                suggestions={onShelf[product._id] || []}
                                label={`IMEI / serial numbers of ${variantLabel(v)}`}
                              />
                            </div>
                          )}
                          {qty > v.quantity && (
                            <p className="col-span-3 text-xs text-red-600">Only {v.quantity} in stock.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {product && variants.length === 0 && (
                <>
                  {plainAvailable <= 0 && <p className="text-xs text-red-600">This product is out of stock.</p>}
                  {product.tracksSerials && (
                    <Field label="IMEI / serial numbers" hint="One for each unit sold. Scan them or type them, then press Enter.">
                      <SerialsInput
                        value={line.serials}
                        onChange={(serials) => updateLine(line.key, { serials })}
                        expected={undefined}
                        suggestions={onShelf[product._id] || []}
                      />
                    </Field>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={product.tracksSerials ? 'Units' : 'Quantity'}>
                      {product.tracksSerials ? (
                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          {line.serials.length} <span className="text-xs text-gray-400">(one for each number)</span>
                        </p>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          max={plainAvailable > 0 ? plainAvailable : undefined}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                          className={inputClass}
                          required
                        />
                      )}
                    </Field>
                    <Field label="Unit price (₦)">
                      <input
                        type="number"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </Field>
                  </div>
                </>
              )}

              {product && (
                <Field
                  label="Warranty (months)"
                  hint={`Leave empty for this product's usual warranty (${warrantyLabel(product.warrantyMonths).toLowerCase()}). Type 0 for none.`}
                >
                  <input
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    value={line.warrantyMonths}
                    onChange={(e) => updateLine(line.key, { warrantyMonths: e.target.value })}
                    placeholder={String(product.warrantyMonths || 0)}
                    className={`${inputClass} sm:max-w-[10rem]`}
                  />
                </Field>
              )}

              {product && lines.length > 1 && (
                <p className="text-right text-sm text-gray-500">
                  Product total: <span className="font-medium text-gray-900">{formatMoney(lineTotal)}</span>
                </p>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addLine}
          className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-primary hover:border-primary hover:bg-gray-50"
        >
          + Add another product for this customer
        </button>

        <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3.5 text-sm text-gray-600 ring-1 ring-primary/15">
          <span>Total:</span>
          <span className="tabular text-lg font-semibold text-gray-900">{formatMoney(grandTotal)}</span>
        </div>

        {/* delivery: a Yes / No question; the amount only appears when the business pays */}
        <div>
          <p id="delivery-question" className="mb-1 text-sm font-medium text-gray-700">
            Are you paying for the delivery?
          </p>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="radiogroup" aria-labelledby="delivery-question">
            {[
              { value: false, label: 'No' },
              { value: true, label: 'Yes' },
            ].map((option) => (
              <label
                key={option.label}
                className={`cursor-pointer rounded-md px-5 py-1.5 text-sm transition focus-within:ring-2 focus-within:ring-primary ${
                  deliveryPaidByUs === option.value
                    ? 'bg-primary font-medium text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryPaidByUs"
                  checked={deliveryPaidByUs === option.value}
                  onChange={() => setDeliveryPaidByUs(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Choose No if the customer pays for the delivery or there is no delivery.
          </p>
        </div>

        {deliveryPaidByUs && (
          <Field
            label="Delivery cost (₦)"
            hint="What you paid for the delivery. This is your expense: it is not added to what the customer pays."
          >
            <input
              type="number"
              min="0"
              value={deliveryCost}
              onChange={(e) => setDeliveryCost(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
        )}

        <Field label="Payment method">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={inputClass}
          >
            <option value="cash">Cash</option>
            <option value="transfer">Bank transfer</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <div className="flex items-center gap-2">
          <input
            id="fullPayment"
            type="checkbox"
            checked={fullPayment}
            onChange={(e) => setFullPayment(e.target.checked)}
          />
          <label htmlFor="fullPayment" className="text-sm text-gray-700">
            Paid in full
          </label>
        </div>

        {!fullPayment && (
          <Field label="Amount paid now (₦)">
            <input
              type="number"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        <Field
          label="Sale photos"
          hint="Take or choose several pictures for this sale (the item, the customer receiving it, proof of payment…)."
        >
          <SalePhotosPicker files={photos} onChange={setPhotos} disabled={saving} />
        </Field>

        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Customer</p>

          <Field label={<>Phone number <span className="text-red-500">(required)</span></>} hint="Pick the country, then type the number. Existing customers are found automatically.">
            <PhoneInput
              country={phoneCountry}
              number={customerPhone}
              onChange={({ country, number }) => {
                setPhoneCountry(country);
                setCustomerPhone(number);
              }}
              required
            />
          </Field>

          {matchedCustomer && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">Existing customer: {matchedCustomer.name}</p>
              {matchedCustomer.address && <p className="text-xs">{matchedCustomer.address}</p>}
              {matchedCustomer.balance > 0 && (
                <p className="text-xs">Currently owes {formatMoney(matchedCustomer.balance)}</p>
              )}
            </div>
          )}

          {isNewCustomer && (
            <>
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-800">
                New customer. They will be saved automatically when you record the sale.
              </p>
              <Field label="Customer name">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Address (optional)">
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>

        {/* the sale is always recorded under the name of the person signed in, so there is nothing to choose */}
        <p className="flex items-center gap-2 text-sm text-gray-500">
          Sold by
          <Avatar name={user.name} photoUrl={user.photoUrl} size="xs" />
          <span className="font-medium text-gray-700">{user.name}</span>
        </p>

        <button
          type="submit"
          disabled={saving}
          className={`${primaryButtonClass} w-full py-2.5`}
        >
          {saving ? 'Recording…' : 'Record sale'}
        </button>

      </form>
    </div>
  );
}
