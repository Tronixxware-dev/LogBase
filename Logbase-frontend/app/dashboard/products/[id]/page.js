'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  addVariant,
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  getProduct,
  updateProduct,
  updateVariant,
  uploadProductImages,
} from '@/lib/api';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import ProductEditForm from '@/components/ProductEditForm';
import ProductPhotosEditor from '@/components/ProductPhotosEditor';
import VariantsManager from '@/components/VariantsManager';
import { newVariantRow } from '@/components/VariantsEditor';
import { ErrorBanner, LoadingState, cardClass, primaryButtonClass } from '@/components/ui';

function formFromProduct(p) {
  return {
    name: p.name || '',
    sku: p.sku || '',
    brand: p.brand || '',
    category: p.category || '',
    costPrice: p.costPrice ?? '',
    sellingPrice: p.sellingPrice ?? '',
    quantity: p.quantity ?? 0,
    reorderThreshold: p.reorderThreshold ?? 0,
    tracksSerials: Boolean(p.tracksSerials),
    warrantyMonths: p.warrantyMonths ?? 0,
  };
}

function rowsFromProduct(p) {
  return (p.variants || []).map((v) => ({
    id: v._id,
    color: v.color || '',
    size: v.size || '',
    quantity: String(v.quantity),
    removed: false,
  }));
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isOwner } = useUser(); // cost prices are for the owner only

  const [product, setProduct] = useState(null); // what is saved on the server
  const [form, setForm] = useState(null); // edits to the product's own fields
  const [rows, setRows] = useState([]); // edits to existing colours / sizes
  const [newRows, setNewRows] = useState([]); // colours / sizes added but not saved yet
  const [removedIds, setRemovedIds] = useState([]); // saved photos marked for removal
  const [photoFiles, setPhotoFiles] = useState([]); // new photos waiting to be uploaded
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const applyProduct = useCallback((p) => {
    setProduct(p);
    setForm(formFromProduct(p));
    setRows(rowsFromProduct(p));
    setNewRows([]);
    setRemovedIds([]);
    setPhotoFiles([]);
  }, []);

  const load = useCallback(() => {
    return getProduct(id)
      .then((data) => applyProduct(data.product))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, applyProduct]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- what has changed ---------------- */

  const hasVariants = (product?.variants || []).length > 0;

  const detailsChanged =
    product &&
    form &&
    (form.name.trim() !== product.name ||
      (form.sku || '') !== (product.sku || '') ||
      (form.brand || '').trim() !== (product.brand || '') ||
      (form.category || '') !== (product.category || '') ||
      (isOwner && Number(form.costPrice) !== product.costPrice) ||
      Number(form.sellingPrice) !== product.sellingPrice ||
      Number(form.reorderThreshold || 0) !== (product.reorderThreshold || 0) ||
      Boolean(form.tracksSerials) !== Boolean(product.tracksSerials) ||
      Number(form.warrantyMonths || 0) !== (product.warrantyMonths || 0) ||
      (!hasVariants && Number(form.quantity || 0) !== product.quantity));

  const removedRows = rows.filter((r) => r.removed);
  const changedRows = rows.filter((r) => {
    if (r.removed) return false;
    const v = product.variants.find((x) => x._id === r.id);
    return (
      v &&
      (r.color.trim() !== (v.color || '') ||
        r.size.trim() !== (v.size || '') ||
        Number(r.quantity) !== v.quantity)
    );
  });
  const addedRows = newRows.filter((r) => r.color.trim() || r.size.trim());

  const photosChanged = removedIds.length > 0 || photoFiles.length > 0;

  const dirty =
    Boolean(detailsChanged) ||
    removedRows.length > 0 ||
    changedRows.length > 0 ||
    addedRows.length > 0 ||
    photosChanged;

  /* ---------------- editing ---------------- */

  function touch() {
    setSaved(false);
  }

  function handleFieldChange(field, value) {
    touch();
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleRowChange(rowId, field, value) {
    touch();
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  }

  function handleRowRemove(rowId, removed) {
    touch();
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, removed } : r)));
  }

  function handleNewChange(key, field, value) {
    touch();
    setNewRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function handleDiscard() {
    setError('');
    applyProduct(product);
  }

  /* ---------------- saving ---------------- */

  async function handleSave() {
    setError('');

    if (!form.name.trim()) {
      setError('Product name is required');
      return;
    }
    if ((isOwner && form.costPrice === '') || form.sellingPrice === '') {
      setError(isOwner ? 'Enter the cost price and the selling price' : 'Enter the selling price');
      return;
    }
    for (const r of changedRows) {
      if (!r.color.trim() && !r.size.trim()) {
        setError('Every colour / size needs a colour or a size');
        return;
      }
      if (r.quantity === '' || Number(r.quantity) < 0) {
        setError('Enter a stock number of 0 or more for every colour / size');
        return;
      }
    }
    for (const r of addedRows) {
      if (r.quantity !== '' && Number(r.quantity) < 0) {
        setError('Enter a stock number of 0 or more for every colour / size');
        return;
      }
    }

    setSaving(true);
    let anySaved = false; // did at least one step reach the server?
    try {
      let latest = null;

      // 1. the product's own fields
      if (detailsChanged) {
        const payload = {
          name: form.name.trim(),
          sku: form.sku,
          brand: form.brand,
          category: form.category,
          sellingPrice: Number(form.sellingPrice),
          reorderThreshold: Number(form.reorderThreshold || 0),
          tracksSerials: Boolean(form.tracksSerials),
          warrantyMonths: Number(form.warrantyMonths || 0),
        };
        if (isOwner) payload.costPrice = Number(form.costPrice);
        if (!hasVariants) payload.quantity = Number(form.quantity || 0);
        latest = (await updateProduct(id, payload)).product;
        anySaved = true;
      }

      // 2. removed colours / sizes, then edited ones, then new ones
      for (const r of removedRows) {
        latest = (await deleteVariant(id, r.id)).product;
        anySaved = true;
      }
      for (const r of changedRows) {
        latest = (
          await updateVariant(id, r.id, {
            color: r.color,
            size: r.size,
            quantity: Number(r.quantity),
          })
        ).product;
        anySaved = true;
      }
      for (const r of addedRows) {
        const payload = { color: r.color, size: r.size };
        if (r.quantity !== '') payload.quantity = Number(r.quantity);
        latest = (await addVariant(id, payload)).product;
        anySaved = true;
      }

      // 3. photos: removed ones first (frees room), then the new ones
      for (const publicId of removedIds) {
        latest = (await deleteProductImage(id, publicId)).product;
        anySaved = true;
      }
      if (photoFiles.length > 0) {
        latest = (await uploadProductImages(id, photoFiles)).product;
        anySaved = true;
      }

      if (latest) applyProduct(latest);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      if (anySaved) {
        // some steps were saved already, so show what is really saved now
        setError(`${err.message} — some of your changes were saved; the page now shows what is saved.`);
        await load();
      } else {
        setError(err.message); // nothing was saved: keep what you typed so you can fix it
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `Delete "${product.name}"? It will be removed from your products list. Past sales and purchases are kept.`
    );
    if (!ok) return;

    setError('');
    setDeleting(true);
    try {
      await deleteProduct(id);
      router.push('/dashboard/products');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  /* ---------------- page ---------------- */

  if (loading) return <LoadingState />;
  if (!product) {
    return (
      <>
        <PageHeader title="Product not found" backHref="/dashboard/products" backLabel="Back to products" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const totalStock =
    rows.filter((r) => !r.removed).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) +
    newRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={product.name}
        subtitle={[product.brand, product.sku ? `SKU: ${product.sku}` : ''].filter(Boolean).join(' · ') || undefined}
        backHref="/dashboard/products"
        backLabel="Back to products"
        action={
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        }
      />

      <ErrorBanner message={error} />

      <div className={`${cardClass} mb-6 p-6`}>
        <h2 className="mb-4 text-lg font-medium text-gray-900">Details</h2>
        <ProductEditForm
          form={form}
          onChange={handleFieldChange}
          hasVariants={hasVariants}
          totalStock={totalStock}
        />
      </div>

      <div className={`${cardClass} mb-6 p-6`}>
        <h2 className="mb-4 text-lg font-medium text-gray-900">Colours &amp; sizes</h2>
        <VariantsManager
          rows={rows}
          newRows={newRows}
          onRowChange={handleRowChange}
          onRowRemove={handleRowRemove}
          onNewChange={handleNewChange}
          onNewRemove={(key) => setNewRows((prev) => prev.filter((r) => r.key !== key))}
          onAddRow={() => {
            touch();
            setNewRows((prev) => [...prev, newVariantRow()]);
          }}
        />
      </div>

      <div className={`${cardClass} p-6`}>
        <h2 className="mb-4 text-lg font-medium text-gray-900">Photo gallery</h2>
        <ProductPhotosEditor
          images={product.images || []}
          removedIds={removedIds}
          onToggleRemove={(publicId) => {
            touch();
            setRemovedIds((prev) =>
              prev.includes(publicId) ? prev.filter((x) => x !== publicId) : [...prev, publicId]
            );
          }}
          files={photoFiles}
          onFilesChange={(files) => {
            touch();
            setPhotoFiles(files);
          }}
          disabled={saving}
        />
      </div>

      {/* One Save button for everything on this page */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`${primaryButtonClass} px-6 py-2.5`}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900"
          >
            Discard changes
          </button>
        )}
        <span className="text-sm text-gray-500" aria-live="polite">
          {saved ? 'All changes saved ✓' : dirty ? 'You have unsaved changes' : ''}
        </span>
      </div>
    </div>
  );
}
