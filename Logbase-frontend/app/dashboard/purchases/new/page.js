'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listProducts,
  listSuppliers,
  listTeam,
  createSupplier,
  createPurchase,
} from '@/lib/api';
import { formatMoney, variantLabel } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import PhoneInput from '@/components/PhoneInput';
import PhotosPicker from '@/components/PhotosPicker';
import SerialsInput from '@/components/SerialsInput';
import { DEFAULT_COUNTRY, parsePhone, phoneKey } from '@/lib/phone';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

const MAX_PURCHASE_PHOTOS = 8;

let lineCounter = 0;

// One product being received. Products with colours / sizes keep a quantity (and cost) per colour
// in `picks`, so several colours can be received at once. Plain products use quantity / cost.
function newLine(productId = '') {
  lineCounter += 1;
  // serials: IMEI / serial numbers received (optional, only for tracked products); with colours they live in each pick
  return { key: lineCounter, productId, quantity: 1, cost: '', picks: {}, serials: [] };
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { user, isOwner } = useUser(); // only the owner sees or types what the goods cost
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [team, setTeam] = useState([]);
  const [lines, setLines] = useState([newLine()]);
  const [batchNumber, setBatchNumber] = useState('');
  const [purchasedBy, setPurchasedBy] = useState(user.name || '');
  // Does the business pay for the delivery? "No" means the supplier pays and there is nothing to record.
  const [deliveryPaidByUs, setDeliveryPaidByUs] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState('');
  // Did the business pay for the goods in full? "No" means part (or all) of it is owed to the supplier.
  const [paidInFull, setPaidInFull] = useState(true);
  const [amountPaid, setAmountPaid] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_COUNTRY);
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // only the administrator deals with suppliers: a staff never asks for them
    Promise.all([listProducts(), isOwner ? listSuppliers() : Promise.resolve({ suppliers: [] }), listTeam()])
      .then(([productsData, suppliersData, teamData]) => {
        setProducts(productsData.products || []);
        setSuppliers(suppliersData.suppliers || []);
        setTeam(teamData.team || []);
      })
      .catch((err) => setError(err.message));
  }, [isOwner]);

  // The phone number finds the supplier: a known number picks the saved supplier,
  // an unknown number means a new supplier, who is saved automatically with the purchase.
  // How many digits are needed depends on the country code chosen.
  const parsedPhone = parsePhone(phoneCountry, supplierPhone);
  const matchedSupplier = parsedPhone.valid
    ? suppliers.find((s) => phoneKey(s.phone) === parsedPhone.key)
    : null;
  const isNewSupplier = parsedPhone.valid && !matchedSupplier;

  function productOf(line) {
    return products.find((p) => p._id === line.productId);
  }

  // A colour can have its own cost price; otherwise the product's cost price applies.
  function costFor(product, variant) {
    if (variant && variant.costPrice != null) return variant.costPrice;
    return product && product.costPrice != null ? product.costPrice : '';
  }

  // What this line is receiving, as one entry per colour / size (or one entry for a plain product).
  function itemsOf(line) {
    const product = productOf(line);
    if (!product) return [];
    if (product.variants?.length > 0) {
      return product.variants
        .map((v) => {
          const pick = line.picks[v._id];
          // when IMEI / serial numbers are entered they decide the quantity (all of them, or none)
          const serials = product.tracksSerials && pick?.serials?.length > 0 ? pick.serials : undefined;
          return {
            product: product._id,
            variant: v._id,
            quantity: serials ? serials.length : Number(pick?.quantity) || 0,
            costPricePerUnit:
              pick?.cost !== undefined && pick.cost !== '' ? Number(pick.cost) : Number(costFor(product, v)) || 0,
            serials,
          };
        })
        .filter((item) => item.quantity > 0);
    }
    const serials = product.tracksSerials && line.serials.length > 0 ? line.serials : undefined;
    return [
      {
        product: product._id,
        quantity: serials ? serials.length : Number(line.quantity) || 0,
        costPricePerUnit: Number(line.cost) || 0,
        serials,
      },
    ];
  }

  const grandTotal = lines.reduce(
    (sum, l) => sum + itemsOf(l).reduce((s, item) => s + item.quantity * item.costPricePerUnit, 0),
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
      cost: product ? costFor(product, null) : '',
    });
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
      const lineItems = itemsOf(line);
      if (lineItems.length === 0) {
        setError(
          product.variants?.length > 0
            ? `Enter a quantity for at least one colour / size of ${product.name}`
            : `Enter a quantity${where}`
        );
        return;
      }
      items.push(...lineItems);
    }

    if (deliveryPaidByUs && !(Number(deliveryCost) > 0)) {
      setError('Enter how much you paid for the delivery, or choose No if you did not pay for it');
      return;
    }
    // on credit: the owner says how much was paid today; a staff (who never sees costs) just says it is not paid yet
    if (isOwner && !paidInFull) {
      const paidNow = Number(amountPaid);
      if (amountPaid === '' || !Number.isFinite(paidNow) || paidNow < 0) {
        setError('Enter how much you paid today (0 if you paid nothing), or choose Yes if you paid in full');
        return;
      }
      if (paidNow >= grandTotal) {
        setError('That is the full price. Choose Yes for "Paid in full", or enter less than the total.');
        return;
      }
    }
    if (isOwner && !parsedPhone.valid) {
      setError(parsedPhone.message);
      return;
    }
    if (isOwner && isNewSupplier && !supplierName.trim()) {
      setError('This phone number is new. Enter the supplier name so they can be saved.');
      return;
    }

    setSaving(true);
    try {
      // A new phone number becomes a saved supplier first, so the purchase is linked to them.
      let supplier = matchedSupplier;
      if (isOwner && !supplier) {
        const created = await createSupplier({
          name: supplierName.trim(),
          phone: parsedPhone.e164,
          email: supplierEmail.trim() || undefined,
          address: supplierAddress.trim() || undefined,
        });
        supplier = created.supplier;
        // now known, so trying again finds them instead of saving them twice
        setSuppliers((prev) => [...prev, supplier]);
      }

      // The photos travel with the purchase, so the purchase and its photos are saved together.
      await createPurchase(
        {
          items,
          // a staff records goods without a supplier: the administrator adds it afterwards
          ...(isOwner ? { supplier: supplier._id } : {}),
          purchasedBy: purchasedBy.trim() || undefined,
          batchNumber: batchNumber.trim() || undefined,
          deliveryPaidByUs,
          deliveryCost: deliveryPaidByUs ? Number(deliveryCost) : 0,
          ...(isOwner && !paidInFull ? { amountPaid: Number(amountPaid) } : {}),
        },
        photos
      );

      router.push('/dashboard/purchases');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Record a purchase"
        subtitle="Adds the quantities to your stock. The date and time are saved automatically. Pick as many colours or products as you received."
        backHref="/dashboard/purchases"
        backLabel="Back to purchases"
      />

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4 p-6`}>
        {lines.map((line, index) => {
          const product = productOf(line);
          const variants = product?.variants || [];
          const lineTotal = itemsOf(line).reduce((sum, item) => sum + item.quantity * item.costPricePerUnit, 0);
          const cover = product?.images?.find((img) => img.isCover) || product?.images?.[0];

          return (
            <div key={line.key} className="space-y-4 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  {lines.length > 1 ? `Product ${index + 1}` : 'Product received'}
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
                  <p className="mb-1 text-sm font-medium text-gray-700">Colours / sizes received</p>
                  <p className="mb-2 text-xs text-gray-400">
                    Type how many of each colour arrived. Leave the others empty.
                  </p>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {variants.map((v) => {
                      const pick = line.picks[v._id] || {};
                      const cost = pick.cost !== undefined && pick.cost !== '' ? pick.cost : costFor(product, v);
                      const hasSerials = Boolean(product.tracksSerials) && (pick.serials || []).length > 0;
                      return (
                        <div
                          key={v._id}
                          className={`grid items-center gap-2 p-3 ${isOwner ? 'grid-cols-[1fr_5rem_7rem]' : 'grid-cols-[1fr_6rem]'}`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{variantLabel(v)}</p>
                            <p className="text-xs text-gray-400">{v.quantity} in stock now</p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={hasSerials ? pick.serials.length : pick.quantity ?? ''}
                            disabled={hasSerials}
                            onChange={(e) => updatePick(line, v._id, { quantity: e.target.value })}
                            className={inputClass}
                            aria-label={`Quantity of ${variantLabel(v)}`}
                          />
                          {isOwner && (
                            <input
                              type="number"
                              min="0"
                              placeholder="Cost ₦"
                              value={cost}
                              onChange={(e) => updatePick(line, v._id, { cost: e.target.value })}
                              className={inputClass}
                              aria-label={`Cost per unit of ${variantLabel(v)}`}
                            />
                          )}
                          {product.tracksSerials && (
                            <div className={isOwner ? 'col-span-3' : 'col-span-2'}>
                              <p className="mb-1 text-xs text-gray-400">IMEI / serial numbers (optional: all of them, or none)</p>
                              <SerialsInput
                                value={pick.serials || []}
                                onChange={(serials) => updatePick(line, v._id, { serials })}
                                label={`IMEI / serial numbers of ${variantLabel(v)}`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {product && variants.length === 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Quantity received">
                    <input
                      type="number"
                      min="1"
                      value={product.tracksSerials && line.serials.length > 0 ? line.serials.length : line.quantity}
                      disabled={product.tracksSerials && line.serials.length > 0}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </Field>
                  {isOwner && (
                    <Field label="Cost per unit (₦)">
                      <input
                        type="number"
                        min="0"
                        value={line.cost}
                        onChange={(e) => updateLine(line.key, { cost: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </Field>
                  )}
                </div>
              )}

              {product && product.tracksSerials && variants.length === 0 && (
                <Field
                  label="IMEI / serial numbers (optional)"
                  hint="Enter one for every unit received, or leave this empty. Recording them lets you look each unit up later and sell it with a warranty."
                >
                  <SerialsInput value={line.serials} onChange={(serials) => updateLine(line.key, { serials })} />
                </Field>
              )}

              {isOwner && product && lines.length > 1 && (
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
          + Add another product
        </button>

        {isOwner && (
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Total cost: <span className="font-semibold text-gray-900">{formatMoney(grandTotal)}</span>
          </div>
        )}

        {/* paying for the goods: a Yes / No question; "No" puts what is unpaid on the supplier's account (administrator only) */}
        {isOwner && (
        <div>
          <p id="paid-question" className="mb-1 text-sm font-medium text-gray-700">
            Did you pay for these goods in full?
          </p>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="radiogroup" aria-labelledby="paid-question">
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No, on credit' },
            ].map((option) => (
              <label
                key={option.label}
                className={`cursor-pointer rounded-md px-5 py-1.5 text-sm transition focus-within:ring-2 focus-within:ring-primary ${
                  paidInFull === option.value ? 'bg-primary font-medium text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <input
                  type="radio"
                  name="paidInFull"
                  checked={paidInFull === option.value}
                  onChange={() => setPaidInFull(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {paidInFull && (
            <p className="mt-1 text-xs text-gray-400">Choose &quot;No, on credit&quot; if you took the goods and still owe the supplier.</p>
          )}
        </div>
        )}

        {!paidInFull && isOwner && (
          <div className="space-y-2">
            <Field label="Amount you paid today (₦)" hint="Enter 0 if you paid nothing yet. The rest is added to what you owe this supplier.">
              <input
                type="number"
                min="0"
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            {amountPaid !== '' && Number(amountPaid) >= 0 && Number(amountPaid) < grandTotal && (
              <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
                You will still owe the supplier <span className="font-semibold">{formatMoney(grandTotal - Number(amountPaid))}</span>
              </p>
            )}
          </div>
        )}

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
            Choose No if you did not pay for the delivery or there was no delivery cost.
          </p>
        </div>

        {deliveryPaidByUs && (
          <Field
            label="Delivery cost (₦)"
            hint="What you paid to get these goods delivered. This is your expense: it is kept separate from the cost of the goods."
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

        <Field label="Batch number (optional)">
          <input
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Purchase photos"
          hint="Take or choose several pictures for this purchase (the goods received, the invoice, the delivery…)."
        >
          <PhotosPicker
            files={photos}
            onChange={setPhotos}
            max={MAX_PURCHASE_PHOTOS}
            disabled={saving}
            hint="Photos can only be added now. They cannot be changed after the purchase is recorded."
          />
        </Field>

        {isOwner && (
        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Supplier</p>

          <Field
            label={<>Phone number <span className="text-red-500">(required)</span></>}
            hint="Pick the country, then type the number. Existing suppliers are found automatically."
          >
            <PhoneInput
              country={phoneCountry}
              number={supplierPhone}
              onChange={({ country, number }) => {
                setPhoneCountry(country);
                setSupplierPhone(number);
              }}
              required
            />
          </Field>

          <Field
            label="Email address (optional)"
            hint={matchedSupplier ? 'Saved supplier. Their details can be changed on the Suppliers page.' : undefined}
          >
            <input
              type="email"
              value={matchedSupplier ? matchedSupplier.email || '' : supplierEmail}
              onChange={(e) => setSupplierEmail(e.target.value)}
              placeholder={matchedSupplier ? 'No email saved' : 'name@example.com'}
              disabled={Boolean(matchedSupplier)}
              className={inputClass}
            />
          </Field>

          {matchedSupplier && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">Existing supplier: {matchedSupplier.name}</p>
              {matchedSupplier.address && <p className="text-xs">{matchedSupplier.address}</p>}
            </div>
          )}

          {isNewSupplier && (
            <>
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-800">
                New supplier. They will be saved automatically when you record the purchase.
              </p>
              <Field label="Supplier name">
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Address (optional)">
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>
        )}

        <Field label="Purchased by" hint="Defaults to you. If a staff member made this purchase, pick or type their name.">
          <input
            type="text"
            list="team-names"
            value={purchasedBy}
            onChange={(e) => setPurchasedBy(e.target.value)}
            className={inputClass}
            required
          />
          <datalist id="team-names">
            {team.map((member) => (
              <option key={member.id} value={member.name} />
            ))}
          </datalist>
        </Field>

        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5`}>
          {saving ? 'Recording…' : 'Record purchase'}
        </button>
      </form>
    </div>
  );
}
