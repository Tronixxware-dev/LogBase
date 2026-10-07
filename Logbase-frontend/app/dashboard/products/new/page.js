'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createProduct, uploadProductImages } from '@/lib/api';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import PhotosPicker from '@/components/PhotosPicker';
import BrandInput from '@/components/BrandInput';
import CategoryPicker from '@/components/CategoryPicker';
import TrackingFields from '@/components/TrackingFields';
import VariantsEditor, { newVariantRow } from '@/components/VariantsEditor';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

export default function NewProductPage() {
  const router = useRouter();
  const { isOwner } = useUser(); // only the owner sets the cost price
  const [form, setForm] = useState({
    name: '',
    sku: '',
    brand: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    reorderThreshold: '',
    tracksSerials: false,
    warrantyMonths: '',
  });
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [savedProductId, setSavedProductId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function toggleVariants(checked) {
    setHasVariants(checked);
    if (checked && variants.length === 0) setVariants([newVariantRow()]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    let variantPayload = [];
    if (hasVariants) {
      const filled = variants.filter((v) => v.color.trim() || v.size.trim());
      if (filled.length === 0) {
        setError('Add at least one colour or size, or switch the option off.');
        return;
      }
      variantPayload = filled.map((v) => ({
        color: v.color,
        size: v.size,
        quantity: Number(v.quantity || 0),
      }));
    }

    setSaving(true);
    try {
      const data = await createProduct({
        name: form.name,
        sku: form.sku,
        brand: form.brand,
        category: form.category,
        ...(isOwner ? { costPrice: Number(form.costPrice) } : {}),
        sellingPrice: Number(form.sellingPrice),
        reorderThreshold: Number(form.reorderThreshold || 0),
        tracksSerials: Boolean(form.tracksSerials),
        warrantyMonths: Number(form.warrantyMonths || 0),
        ...(hasVariants ? { variants: variantPayload } : { quantity: Number(form.quantity || 0) }),
      });
      const productId = data.product._id;

      // The product is saved. Now attach the photos (if any).
      if (photos.length > 0) {
        setSavedProductId(productId);
        try {
          await uploadProductImages(productId, photos);
        } catch (uploadErr) {
          setError(`The product was saved, but the photos could not be uploaded: ${uploadErr.message}`);
          return;
        }
      }
      router.push(`/dashboard/products/${productId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Add a product"
        subtitle="Add the details and photos, then save."
        backHref="/dashboard/products"
        backLabel="Back to products"
      />

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-5 p-6`}>
        <Field label="Product name">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="Ankara gown"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brand (optional)">
            <BrandInput value={form.brand} onChange={(brand) => setForm((prev) => ({ ...prev, brand }))} />
          </Field>
          <Field label="Category">
            <CategoryPicker value={form.category} onChange={(category) => setForm({ ...form, category })} />
          </Field>
        </div>

        <Field label="SKU (optional)">
          <input
            name="sku"
            value={form.sku}
            onChange={handleChange}
            className={inputClass}
            placeholder="GOWN-01"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isOwner && (
            <Field label="Cost price (₦)">
              <input
                type="number"
                name="costPrice"
                value={form.costPrice}
                onChange={handleChange}
                required
                min="0"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Selling price (₦)">
            <input
              type="number"
              name="sellingPrice"
              value={form.sellingPrice}
              onChange={handleChange}
              required
              min="0"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={(e) => toggleVariants(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">This product comes in different colours or sizes</span>
              <span className="block text-xs text-gray-400">
                Each colour / size gets its own stock count, so you always know what is left.
              </span>
            </span>
          </label>

          {hasVariants && (
            <div className="mt-4">
              <VariantsEditor rows={variants} onChange={setVariants} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!hasVariants && (
            <Field label="Starting quantity">
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="0"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Reorder alert at" hint="You'll see a low-stock flag at or below this number.">
            <input
              type="number"
              name="reorderThreshold"
              value={form.reorderThreshold}
              onChange={handleChange}
              min="0"
              className={inputClass}
            />
          </Field>
        </div>

        <TrackingFields form={form} onChange={(name, value) => setForm((prev) => ({ ...prev, [name]: value }))} />

        <Field label="Product photos" hint="Take or choose several pictures. The first one becomes the cover photo.">
          <PhotosPicker
            files={photos}
            onChange={setPhotos}
            max={6}
            disabled={saving || Boolean(savedProductId)}
          />
        </Field>

        <button
          type="submit"
          disabled={saving || Boolean(savedProductId)}
          className={`${primaryButtonClass} w-full py-2.5`}
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </button>

        {savedProductId && (
          <p className="text-center text-sm text-gray-600">
            This product is already saved.{' '}
            <Link
              href={`/dashboard/products/${savedProductId}`}
              className="font-medium text-primary hover:underline"
            >
              Open it to add the photos again
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
