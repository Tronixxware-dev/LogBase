'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { availableSerials, createTransfer, listProducts } from '@/lib/api';
import { variantLabel } from '@/lib/format';
import { forShop } from '@/lib/shopStorage';
import { newClientId } from '@/lib/outbox';
import { notifySuccess } from '@/lib/feedback';
import { useShops } from '@/lib/shops';
import PageHeader from '@/components/PageHeader';
import SerialsInput from '@/components/SerialsInput';
import { Icon } from '@/components/Icons';
import {
  EmptyState,
  ErrorBanner,
  Field,
  LoadingState,
  cardClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';

let rowCounter = 0;
const newRow = () => ({ key: `r${(rowCounter += 1)}`, productId: '', variantId: '', quantity: '1', serials: [] });

// Send stock from the store you are working in to another store. It leaves this store now and joins the other one
// when someone there accepts it.
export default function NewTransferPage() {
  const router = useRouter();
  const { shops, active, multiple, ready } = useShops();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toShop, setToShop] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState([newRow()]);
  const [onShelf, setOnShelf] = useState({}); // IMEI suggestions by "product|variant"
  const [saving, setSaving] = useState(false);
  const clientId = useRef(null);

  useEffect(() => {
    listProducts()
      .then((data) => setProducts(forShop(data.products || [])))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const destinations = useMemo(() => shops.filter((s) => !active || s._id !== active._id), [shops, active]);

  function updateRow(key, changes) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  }

  function loadSerials(product, variantId) {
    const id = `${product._id}|${variantId || ''}`;
    if (onShelf[id]) return;
    // suggestions only: the numbers can still be typed if this fails
    availableSerials(product._id, variantId || undefined)
      .then((data) => setOnShelf((prev) => ({ ...prev, [id]: (data.serials || []).map((s) => (typeof s === 'string' ? s : s.serial)) })))
      .catch(() => {});
  }

  function chooseProduct(row, productId) {
    const product = products.find((p) => p._id === productId);
    updateRow(row.key, { productId, variantId: '', quantity: '1', serials: [] });
    if (product && product.tracksSerials && !(product.variants || []).length) loadSerials(product, '');
  }

  function chooseVariant(row, product, variantId) {
    updateRow(row.key, { variantId, quantity: '1', serials: [] });
    if (product.tracksSerials && variantId) loadSerials(product, variantId);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError('');
    if (!toShop) return setError('Choose the store the stock is going to.');

    const items = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const product = products.find((p) => p._id === row.productId);
      if (!product) return setError(`Item ${i + 1}: choose a product.`);
      const variants = product.variants || [];
      const variant = variants.find((v) => v._id === row.variantId);
      if (variants.length > 0 && !variant) return setError(`Item ${i + 1}: choose the colour / size of ${product.name}.`);
      const have = variant ? variant.quantity : product.quantity;
      const quantity = Number(row.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return setError(`Item ${i + 1}: enter how many pieces to send.`);
      if (product.tracksSerials && !Number.isInteger(quantity)) return setError(`Item ${i + 1}: ${product.name} is sent in whole pieces.`);
      if (product.tracksSerials && row.serials.length > quantity) {
        return setError(`Item ${i + 1}: you named ${row.serials.length} IMEI / serial numbers but are sending ${quantity} pieces. Raise the pieces or remove some numbers.`);
      }
      if (quantity > have) return setError(`Item ${i + 1}: ${active ? active.name : 'this store'} only has ${have} of ${product.name}${variant ? ` (${variantLabel(variant)})` : ''}.`);
      items.push({
        product: product._id,
        variant: variant ? variant._id : undefined,
        quantity,
        serials: product.tracksSerials && row.serials.length > 0 ? row.serials : undefined,
      });
    }

    // one id per attempt: a double tap or a lost answer is not sent twice
    if (!clientId.current) clientId.current = newClientId();
    setSaving(true);
    try {
      const data = await createTransfer({ toShop, items, note: note.trim() || undefined, clientId: clientId.current });
      const target = destinations.find((s) => s._id === toShop);
      notifySuccess('Transfer sent', target ? `Waiting for ${target.name} to accept` : 'Waiting to be accepted');
      router.push(`/dashboard/transfers/${data.transfer._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading || !ready) {
    return (
      <>
        <PageHeader title="New transfer" backHref="/dashboard/transfers" backLabel="Back to transfers" />
        <LoadingState />
      </>
    );
  }

  if (!multiple) {
    return (
      <>
        <PageHeader title="New transfer" backHref="/dashboard/transfers" backLabel="Back to transfers" />
        <EmptyState
          icon="transfer"
          message="You need a second store to transfer stock."
          actionHref="/dashboard/stores"
          actionLabel="Add another store"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New transfer"
        subtitle={`Send stock from ${active ? active.name : 'this store'} to another store.`}
        backHref="/dashboard/transfers"
        backLabel="Back to transfers"
      />
      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div className={`${cardClass} grid grid-cols-1 gap-4 p-5 sm:grid-cols-2`}>
          <Field label="From">
            <p className="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700">{active ? active.name : 'Main store'}</p>
          </Field>
          <Field label="To store">
            <select value={toShop} onChange={(e) => setToShop(e.target.value)} className={inputClass} required>
              <option value="">Choose a store</option>
              {destinations.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {rows.map((row, index) => {
          const product = products.find((p) => p._id === row.productId);
          const variants = product ? product.variants || [] : [];
          const variant = variants.find((v) => v._id === row.variantId);
          const have = product ? (variants.length > 0 ? (variant ? variant.quantity : null) : product.quantity) : null;
          const taken = new Set(rows.filter((r) => r.key !== row.key).map((r) => `${r.productId}|${r.variantId}`));
          return (
            <div key={row.key} className={`${cardClass} space-y-4 p-5`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Item {index + 1}</p>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <Field label="Product">
                <select value={row.productId} onChange={(e) => chooseProduct(row, e.target.value)} className={inputClass}>
                  <option value="">Choose a product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id} disabled={p.quantity <= 0 && !(p.variants || []).some((v) => v.quantity > 0)}>
                      {p.name} ({p.quantity} here)
                    </option>
                  ))}
                </select>
              </Field>

              {variants.length > 0 && (
                <Field label="Colour / size">
                  <select value={row.variantId} onChange={(e) => chooseVariant(row, product, e.target.value)} className={inputClass}>
                    <option value="">Choose one</option>
                    {variants.map((v) => (
                      <option key={v._id} value={v._id} disabled={v.quantity <= 0 || taken.has(`${product._id}|${v._id}`)}>
                        {variantLabel(v)} ({v.quantity} here)
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {product && (variants.length === 0 || variant) && (
                <>
                  <Field label={product.tracksSerials ? 'Pieces to send' : 'Quantity'} hint={have !== null ? `${have} available in ${active ? active.name : 'this store'}` : undefined}>
                    <input
                      type="number"
                      min="1"
                      max={have > 0 ? have : undefined}
                      step={product.tracksSerials ? '1' : 'any'}
                      inputMode={product.tracksSerials ? 'numeric' : 'decimal'}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  {product.tracksSerials && (
                    <Field
                      label="IMEI / serial numbers (optional)"
                      hint="Only if you want to name particular phones. Scan or type them, then press Enter. The rest of the pieces are sent without a number."
                    >
                      <SerialsInput
                        value={row.serials}
                        // naming more phones than the pieces typed raises the pieces to match
                        onChange={(serials) => updateRow(row.key, { serials, quantity: String(Math.max(Number(row.quantity) || 0, serials.length)) })}
                        suggestions={onShelf[`${product._id}|${row.variantId}`] || []}
                      />
                    </Field>
                  )}
                  {product.tracksSerials && (
                    <p className="text-xs text-gray-500">
                      Sending {Number(row.quantity) || 0} piece{Number(row.quantity) === 1 ? '' : 's'}
                      {row.serials.length > 0 ? `, ${row.serials.length} named by IMEI / serial number` : ''}.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}

        {rows.length < 50 && (
          <button type="button" onClick={() => setRows((prev) => [...prev, newRow()])} className={secondaryButtonClass}>
            <Icon name="plus" className="h-4 w-4" />
            Add another item
          </button>
        )}

        <div className={`${cardClass} p-5`}>
          <Field label="Note (optional)">
            <input
              type="text"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For example: stock for the weekend sale"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Sending…' : 'Send transfer'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard/transfers')} className={secondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
