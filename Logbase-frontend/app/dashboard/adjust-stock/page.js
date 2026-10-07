'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listProducts, createStockAdjustment, listStockAdjustments } from '@/lib/api';
import { formatDateTime, formatMoney, variantLabel } from '@/lib/format';
import { ADJUST_TYPES, previewStock, typeInfo } from '@/lib/stockAdjust';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import {
  ErrorBanner,
  Field,
  LoadingState,
  cardClass,
  inputClass,
  primaryButtonClass,
} from '@/components/ui';

// Change how many units are in stock by hand: damaged, lost, expired, stolen or found items, or a recount
// of the shelf. Every change is saved with who made it and why, and shows on Stock activities.
export default function AdjustStockPage() {
  const { isOwner } = useUser();
  const [products, setProducts] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [type, setType] = useState('damaged');
  const [direction, setDirection] = useState('out');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const [productsData, adjustmentsData] = await Promise.all([
      listProducts(),
      listStockAdjustments().catch(() => ({ adjustments: [] })),
    ]);
    setProducts((productsData.products || []).slice().sort((a, b) => a.name.localeCompare(b.name)));
    setRecent((adjustmentsData.adjustments || []).slice(0, 8));
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  const product = useMemo(() => products.find((p) => p._id === productId) || null, [products, productId]);
  const hasVariants = Boolean(product && product.variants && product.variants.length > 0);
  const variant = hasVariants ? product.variants.find((v) => v._id === variantId) || null : null;
  const current = product ? (hasVariants ? (variant ? variant.quantity : null) : product.quantity) : null;
  const info = typeInfo(type);
  const after = current == null ? null : previewStock({ current, type, quantity, direction });

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!product) return setError('Choose a product');
    if (hasVariants && !variant) return setError(`Choose which colour / size of ${product.name}`);
    if (quantity === '' || Number(quantity) < 0) return setError(type === 'count' ? 'Enter how many you counted' : 'Enter how many units');
    if (info.noteRequired && !note.trim()) return setError('Add a short note explaining this change');

    setSaving(true);
    try {
      const data = await createStockAdjustment({
        product: product._id,
        variant: variant ? variant._id : undefined,
        type,
        direction: type === 'other' ? direction : undefined,
        quantity: Number(quantity),
        note: note.trim(),
      });
      const a = data.adjustment;
      const label = a.variantLabel ? `${a.productName} (${a.variantLabel})` : a.productName;
      setSuccess(`Saved: ${label} went from ${a.before} to ${a.after}.`);
      setQuantity('');
      setNote('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Adjust stock"
        subtitle="Record damaged, lost or found items, or correct the count after checking the shelf."
        backHref="/dashboard/stock-activities"
        backLabel="Back to stock activities"
      />

      <ErrorBanner message={error} />
      {success && <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}

      <form onSubmit={submit} className={`${cardClass} space-y-5 p-6`}>
        <Field label="Product">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to find a product"
            className={`${inputClass} mb-2`}
            aria-label="Search products"
          />
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setVariantId('');
              setSuccess('');
            }}
            className={inputClass}
            aria-label="Product"
          >
            <option value="">Choose a product…</option>
            {shown.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.quantity} in stock)
              </option>
            ))}
          </select>
        </Field>

        {hasVariants && (
          <Field label="Colour / size">
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={inputClass} aria-label="Colour or size">
              <option value="">Choose one…</option>
              {product.variants.map((v) => (
                <option key={v._id} value={v._id}>
                  {variantLabel(v)} ({v.quantity} in stock)
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="What happened?" hint={info.hint}>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass} aria-label="Reason">
            {ADJUST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        {type === 'other' && (
          <Field label="Add or take out?">
            <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputClass} aria-label="Direction">
              <option value="out">Take units out of stock</option>
              <option value="in">Add units to stock</option>
            </select>
          </Field>
        )}

        <Field
          label={type === 'count' ? 'How many are on the shelf now?' : 'How many units?'}
          hint={current != null ? `The system shows ${current} in stock now.` : undefined}
        >
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
            aria-label="Quantity"
          />
        </Field>

        {after != null && current != null && (
          <p className={`rounded-lg px-3 py-2 text-sm ${after < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
            {after < 0
              ? `There are only ${current} in stock, so that many cannot be taken out.`
              : `Stock will change from ${current} to ${after}.`}
          </p>
        )}

        <Field label={info.noteRequired ? 'Note (required)' : 'Note (optional)'}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            className={inputClass}
            aria-label="Note"
          />
        </Field>

        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? 'Saving…' : 'Save change'}
        </button>
      </form>

      {recent.length > 0 && (
        <div className={`${cardClass} mt-6 p-6`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent changes</h2>
            <Link href="/dashboard/stock-activities" className="text-sm text-primary hover:underline">
              See all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100 text-sm">
            {recent.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-gray-900">
                    {a.productName}
                    {a.variantLabel ? ` · ${a.variantLabel}` : ''}
                  </span>
                  <span className="ml-2 text-gray-500">
                    {typeInfo(a.type).label}: {a.before} → {a.after}
                  </span>
                  {isOwner && a.costValue != null && a.costValue !== 0 && (
                    <span className="ml-2 text-xs text-gray-400">{formatMoney(Math.abs(a.costValue))} at cost</span>
                  )}
                </span>
                <span className="text-xs text-gray-400">
                  {a.createdByName ? `${a.createdByName} · ` : ''}
                  {formatDateTime(a.date || a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
