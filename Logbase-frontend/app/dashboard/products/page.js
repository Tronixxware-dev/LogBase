'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { deleteProduct, listProducts } from '@/lib/api';
import { notifySuccess } from '@/lib/feedback';
import { Icon } from '@/components/Icons';
import { useShops } from '@/lib/shops';
import { forShop } from '@/lib/shopStorage';
import { formatMoney, variantLabel } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import FilterBar from '@/components/FilterBar';
import {
  ErrorBanner,
  LoadingState,
  EmptyState,
  ListTotal,
  PrimaryLink,
} from '@/components/ui';

const isLow = (p) => p.quantity <= p.reorderThreshold;

// Products and stock in one place: what each product is, what it sells for, and how many are on the shelf.
// Everyone who may see stock can open this page; only people who manage products can add or open a product.
function ProductsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useUser();
  const canManage = can('manageProducts');
  const { multiple, scopeReady } = useShops();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(searchParams.get('lowStock') === 'true');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState('');
  const [deletingId, setDeletingId] = useState('');

  // The Overview's "Low stock" card links here with ?lowStock=true,
  // and the Categories page links here with ?category=Name
  useEffect(() => {
    setLowOnly(searchParams.get('lowStock') === 'true');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  // with several stores, the stock shown is what the store being worked in holds
  useEffect(() => {
    if (!scopeReady) return;
    listProducts()
      .then((data) => setProducts(multiple ? forShop(data.products || []) : data.products || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scopeReady, multiple]);

  // the category filter is built from the products themselves, so it works without access to the Categories page
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  // same for brands (compared ignoring capital letters, so "apple" and "Apple" are one brand)
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
      if (lowOnly && !isLow(p)) return false;
      if (category && p.category !== category) return false;
      if (brand && (p.brand || '').trim().toLowerCase() !== brand.toLowerCase()) return false;
      if (!q) return true;
      return [p.name, p.brand, p.sku, p.category].some((v) => v && v.toLowerCase().includes(q));
    });
  }, [products, search, lowOnly, category, brand]);

  // Delete = archive: the product leaves this list, its sales and purchases stay, and it can be brought back from Inventory > Archive
  async function handleDelete(p) {
    const ok = window.confirm(
      `Delete "${p.name}"? It will be removed from your products list. Past sales and purchases are kept, and you can bring it back from Inventory > Archive.`
    );
    if (!ok) return;
    setError('');
    setDeletingId(p._id);
    try {
      await deleteProduct(p._id);
      setProducts((prev) => prev.filter((x) => x._id !== p._id));
      notifySuccess('Product deleted', p.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId('');
    }
  }

  const totalUnits = filtered.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (p) => {
        const cover = p.images?.find((img) => img.isCover) || p.images?.[0];
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {cover && <img src={cover.url} alt={p.name} className="h-full w-full object-cover" />}
            </div>
            <span className="font-medium text-gray-900">{p.name}</span>
          </div>
        );
      },
    },
    { key: 'brand', label: 'Brand', render: (p) => p.brand || '—' },
    { key: 'category', label: 'Category' },
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
              <span
                key={v._id}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  v.quantity <= 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {variantLabel(v)}: <span className="font-medium">{v.quantity}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      label: 'In stock',
      render: (p) => (
        <span className={isLow(p) ? 'font-medium text-red-600' : 'font-medium text-gray-900'}>
          {p.quantity}
          {isLow(p) && (
            <span className="ml-2 text-xs font-normal text-red-500">{p.quantity <= 0 ? 'out of stock' : 'low'}</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <ErrorBanner message={error} />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search by name, brand, SKU or category', label: 'Search products' }}
        filters={[
          { key: 'category', label: 'Category', value: category, onChange: setCategory, options: [{ value: '', label: 'All categories' }, ...categories.map((n) => ({ value: n, label: n }))] },
          brands.length > 0 && { key: 'brand', label: 'Brand', value: brand, onChange: setBrand, options: [{ value: '', label: 'All brands' }, ...brands.map((n) => ({ value: n, label: n }))] },
          {
            key: 'stock',
            label: 'Stock',
            value: lowOnly ? 'low' : 'all',
            onChange: (v) => setLowOnly(v === 'low'),
            options: [
              { value: 'all', label: 'Any stock' },
              { value: 'low', label: 'Low or out of stock' },
            ],
          },
        ]}
      />

      {!loading && products.length > 0 && (
        <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <ListTotal count={filtered.length} noun="product" className="" />
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{totalUnits.toLocaleString()}</span> units in stock
            {filtered.length !== products.length && (
              <span className="text-gray-400"> (of {products.length.toLocaleString()} products in all)</span>
            )}
          </p>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : products.length === 0 ? (
        canManage ? (
          <EmptyState
            message="No products yet."
            actionHref="/dashboard/products/new"
            actionLabel="Add your first product"
          />
        ) : (
          <EmptyState message="No products yet. The administrator has not added any stock." />
        )
      ) : filtered.length === 0 ? (
        <EmptyState message="No products match these filters." />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          // only people who manage products can open one (that page is where products are edited)
          onRowClick={canManage ? (p) => router.push(`/dashboard/products/${p._id}`) : undefined}
          // the Edit and Delete buttons are for people who manage products
          rowActions={
            canManage
              ? (p) => (
                  <>
                    <Link
                      href={`/dashboard/products/${p._id}`}
                      aria-label={`Edit ${p.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p._id}
                      aria-label={`Delete ${p.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                      {deletingId === p._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </>
                )
              : undefined
          }
        />
      )}
    </>
  );
}

export default function ProductsPage() {
  const { can } = useUser();
  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Your products and how many of each are in stock."
        action={can('manageProducts') ? <PrimaryLink href="/dashboard/products/new">+ Add product</PrimaryLink> : undefined}
      />
      {/* useSearchParams needs a Suspense boundary in Next 16 */}
      <Suspense fallback={<LoadingState label="Loading products…" />}>
        <ProductsList />
      </Suspense>
    </>
  );
}
