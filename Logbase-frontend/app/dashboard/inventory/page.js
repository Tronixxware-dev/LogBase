'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { listProducts, restoreProduct, setLowStockThreshold } from '@/lib/api';
import { formatMoney, variantLabel } from '@/lib/format';
import { toCsv, downloadCsv } from '@/lib/csv';
import { forShop } from '@/lib/shopStorage';
import { useShops } from '@/lib/shops';
import { notifySuccess } from '@/lib/feedback';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import InventoryTabs from '@/components/InventoryTabs';
import DataTable from '@/components/DataTable';
import { Icon } from '@/components/Icons';
import FilterBar from '@/components/FilterBar';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  ListTotal,
  LoadingState,
  PrimaryLink,
  cardClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'imei', label: 'Tracked by IMEI / serial' },
  { value: 'variants', label: 'With colours / sizes' },
  { value: 'plain', label: 'Plain products' },
];

const STOCK = [
  { value: '', label: 'Any stock' },
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const isOut = (p) => p.quantity <= 0;
const isLow = (p) => p.quantity > 0 && p.quantity <= p.reorderThreshold;
const needsAttention = (p) => isOut(p) || isLow(p);
const typeOf = (p) => (p.tracksSerials ? 'imei' : (p.variants || []).length > 0 ? 'variants' : 'plain');

const cover = (p) => (p.images || []).find((img) => img.isCover) || (p.images || [])[0];

function StockBadge({ product }) {
  if (isOut(product)) return <Badge tone="red">Out of stock</Badge>;
  if (isLow(product)) return <Badge tone="amber">Low stock</Badge>;
  return <Badge tone="green">In stock</Badge>;
}

// Everything in the store you are working in: filters, search, low and out of stock, and the archive of deleted products.
function InventoryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isOwner } = useUser();
  const { active, multiple } = useShops();
  const canManage = can('manageProducts');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [archive, setArchive] = useState(false);
  const [layout, setLayout] = useState('list');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');
  const [stock, setStock] = useState(searchParams.get('lowStock') === 'true' ? 'low' : '');
  const [attention, setAttention] = useState(false);
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [threshold, setThreshold] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    listProducts(archive ? '?archived=true' : '')
      .then((data) => setProducts(forShop(data.products || [])))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [archive]);

  useEffect(() => {
    load();
  }, [load]);

  // switching between the active products and the archive reads the list again
  function showArchive(value) {
    if (value === archive) return;
    setLoading(true);
    setError('');
    setProducts([]);
    setAttention(false);
    setArchive(value);
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const brands = useMemo(() => {
    const seen = new Map();
    for (const p of products) {
      const b = (p.brand || '').trim();
      if (b && !seen.has(b.toLowerCase())) seen.set(b.toLowerCase(), b);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (attention && !needsAttention(p)) return false;
      if (category && p.category !== category) return false;
      if (brand && (p.brand || '').trim().toLowerCase() !== brand.toLowerCase()) return false;
      if (type && typeOf(p) !== type) return false;
      if (stock === 'in' && isOut(p)) return false;
      if (stock === 'low' && !isLow(p)) return false;
      if (stock === 'out' && !isOut(p)) return false;
      if (!q) return true;
      return [p.name, p.brand, p.sku, p.category, p.barcode].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [products, search, category, brand, type, stock, attention]);

  const units = filtered.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const attentionCount = products.filter(needsAttention).length;
  const storeName = active ? active.name : 'this store';

  async function saveThreshold(e) {
    e.preventDefault();
    if (busy) return;
    setBusy('threshold');
    setError('');
    try {
      const res = await setLowStockThreshold(Number(threshold));
      notifySuccess('Low stock level saved', `${res.updated} product${res.updated === 1 ? '' : 's'} now warn at ${res.threshold} or fewer`);
      setThresholdOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function restore(p) {
    if (busy) return;
    setBusy(p._id);
    setError('');
    try {
      await restoreProduct(p._id);
      notifySuccess('Product restored', p.name);
      setProducts((prev) => prev.filter((x) => x._id !== p._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function exportCsv() {
    const columns = [
      { label: 'Name', get: (p) => p.name },
      { label: 'SKU', get: (p) => p.sku },
      { label: 'Category', get: (p) => p.category },
      { label: 'Brand', get: (p) => p.brand },
      { label: 'Selling price', get: (p) => p.sellingPrice },
      { label: multiple ? `In ${storeName}` : 'In stock', get: (p) => p.quantity },
      { label: 'Low stock level', get: (p) => p.reorderThreshold },
      { label: 'Colours / sizes', get: (p) => (p.variants || []).map((v) => `${variantLabel(v) || 'Standard'}: ${v.quantity}`).join('; ') },
      { label: 'Status', get: (p) => (isOut(p) ? 'Out of stock' : isLow(p) ? 'Low stock' : 'In stock') },
    ];
    downloadCsv(archive ? 'archived-products.csv' : 'inventory.csv', toCsv(columns, filtered));
  }

  const openProduct = canManage && !archive ? (p) => router.push(`/dashboard/products/${p._id}`) : undefined;

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (p) => {
        const img = cover(p);
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {img && <img src={img.url} alt={p.name} className="h-full w-full object-cover" />}
            </div>
            <span>
              <span className="font-medium text-gray-900">{p.name}</span>
              {p.sku && <span className="block text-xs font-normal text-gray-400">{p.sku}</span>}
            </span>
          </div>
        );
      },
    },
    { key: 'category', label: 'Category', render: (p) => p.category || '—' },
    { key: 'brand', label: 'Brand', render: (p) => p.brand || '—' },
    { key: 'sellingPrice', label: 'Price', render: (p) => formatMoney(p.sellingPrice) },
    {
      key: 'variants',
      label: 'Colours / sizes',
      render: (p) => {
        const list = p.variants || [];
        if (list.length === 0) return '—';
        return (
          <div className="flex flex-wrap gap-1.5">
            {list.map((v) => (
              <span key={v._id} className={`rounded-full px-2 py-0.5 text-xs ${v.quantity <= 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
                {variantLabel(v)}: <span className="font-medium">{v.quantity}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      label: multiple ? `In ${storeName}` : 'In stock',
      render: (p) => (
        <span className="font-medium text-gray-900">
          {p.quantity}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (p) => <StockBadge product={p} /> },
    ...(archive && canManage
      ? [
          {
            key: 'restore',
            label: '',
            render: (p) => (
              <button
                type="button"
                disabled={busy === p._id}
                onClick={(e) => {
                  e.stopPropagation();
                  restore(p);
                }}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {busy === p._id ? 'Restoring…' : 'Restore'}
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <ErrorBanner message={error} />

      {!loading && !archive && products.length > 0 && (
        <div className="mb-5 grid max-w-2xl grid-cols-3 gap-3">
          <div className={`${cardClass} p-4`}>
            <p className="text-xs text-gray-400">Products</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{products.length.toLocaleString()}</p>
          </div>
          <div className={`${cardClass} p-4`}>
            <p className="text-xs text-gray-400">Units in {multiple ? storeName : 'stock'}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{products.reduce((s, p) => s + (Number(p.quantity) || 0), 0).toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={() => setAttention((v) => !v)}
            aria-pressed={attention}
            className={`${cardClass} p-4 text-left transition ${attention ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
          >
            <p className="text-xs text-gray-400">Needs attention</p>
            <p className={`mt-1 text-xl font-semibold ${attentionCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{attentionCount.toLocaleString()}</p>
          </button>
        </div>
      )}

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, brand, SKU or category', label: 'Search inventory' }}
        filters={[
          { key: 'category', label: 'Category', value: category, onChange: setCategory, options: [{ value: '', label: 'All categories' }, ...categories.map((n) => ({ value: n, label: n }))] },
          brands.length > 0 && { key: 'brand', label: 'Brand', value: brand, onChange: setBrand, options: [{ value: '', label: 'All brands' }, ...brands.map((n) => ({ value: n, label: n }))] },
          { key: 'type', label: 'Type', value: type, onChange: setType, options: TYPES },
          { key: 'stock', label: 'Stock', value: stock, onChange: setStock, options: STOCK },
        ]}
        onClear={() => setAttention(false)}
        right={
          <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Layout">
            {[
              ['list', 'list', 'List'],
              ['grid', 'grid', 'Grid'],
            ].map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLayout(value)}
                aria-pressed={layout === value}
                aria-label={`${label} view`}
                className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${
                  layout === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon name={icon} className="h-4 w-4" />
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Show">
          {[
            [false, 'Active'],
            [true, 'Archive'],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => showArchive(value)}
              aria-pressed={archive === value}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                archive === value ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 sm:ml-auto">
          {canManage && !archive && (
            <button type="button" onClick={() => { setThresholdOpen((v) => !v); setThreshold(''); }} className={secondaryButtonClass}>
              Low stock level
            </button>
          )}
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className={secondaryButtonClass}>
            <Icon name="download" className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {thresholdOpen && (
        <form onSubmit={saveThreshold} className={`${cardClass} mb-4 max-w-xl space-y-3 p-5`}>
          <Field label="Warn me when a product has this many left (or fewer)" hint="This sets the same level on every product. You can still change one product on its own page.">
            <input type="number" min="0" step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} className={inputClass} required />
          </Field>
          <div className="flex gap-3">
            <button type="submit" disabled={busy === 'threshold' || threshold === ''} className={primaryButtonClass}>
              {busy === 'threshold' ? 'Saving…' : 'Save for all products'}
            </button>
            <button type="button" onClick={() => setThresholdOpen(false)} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {archive && !loading && (
        <p className="mb-3 text-sm text-gray-500">Deleted products. Their sales history is kept; restore one to sell it again.</p>
      )}

      {loading ? (
        <LoadingState label="Loading inventory…" />
      ) : products.length === 0 ? (
        archive ? (
          <EmptyState icon="archive" message="The archive is empty." />
        ) : canManage ? (
          <EmptyState icon="inventory" message="No products yet." actionHref="/dashboard/products/new" actionLabel="Add your first product" />
        ) : (
          <EmptyState icon="inventory" message="No products yet. The administrator has not added any stock." />
        )
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" message="No products match." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <ListTotal count={filtered.length} noun="product" className="" />
            {!archive && (
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{units.toLocaleString()}</span> units
                {multiple ? ` in ${storeName}` : ' in stock'}
              </p>
            )}
          </div>
          {layout === 'list' ? (
            <DataTable columns={columns} rows={filtered} onRowClick={openProduct} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((p) => {
                const img = cover(p);
                return (
                  <div
                    key={p._id}
                    onClick={openProduct ? () => openProduct(p) : undefined}
                    className={`${cardClass} overflow-hidden ${openProduct ? 'cursor-pointer transition hover:shadow-md' : ''}`}
                  >
                    <div className="aspect-square bg-gray-100">{img && <img src={img.url} alt={p.name} className="h-full w-full object-cover" />}</div>
                    <div className="space-y-1 p-3">
                      <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{formatMoney(p.sellingPrice)}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">{p.quantity}</span>
                        <StockBadge product={p} />
                      </div>
                      {archive && canManage && (
                        <button type="button" disabled={busy === p._id} onClick={() => restore(p)} className="text-xs font-medium text-primary hover:underline disabled:opacity-50">
                          {busy === p._id ? 'Restoring…' : 'Restore'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {isOwner && !multiple && !loading && !archive && products.length > 0 && (
        <p className="mt-6 text-sm text-gray-500">
          Selling from more than one shop?{' '}
          <Link href="/dashboard/stores" className="font-medium text-primary hover:underline">
            Add a store
          </Link>{' '}
          and each one keeps its own stock.
        </p>
      )}
    </>
  );
}

export default function InventoryPage() {
  const { can } = useUser();
  return (
    <>
      <InventoryTabs />
      <PageHeader
        title="Inventory"
        subtitle="Everything you have in stock, what is running low, and the products you removed."
        action={can('manageProducts') ? <PrimaryLink href="/dashboard/products/new">+ Add product</PrimaryLink> : undefined}
      />
      {/* useSearchParams needs a Suspense boundary in Next 16 */}
      <Suspense fallback={<LoadingState label="Loading inventory…" />}>
        <InventoryView />
      </Suspense>
    </>
  );
}
