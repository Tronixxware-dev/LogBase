'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { listProducts } from '@/lib/api';
import { formatMoney, variantLabel } from '@/lib/format';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import {
  ErrorBanner,
  LoadingState,
  EmptyState,
  ListTotal,
  PrimaryLink,
  inputClass,
} from '@/components/ui';

const isLow = (p) => p.quantity <= p.reorderThreshold;

// Products and stock in one place: what each product is, what it sells for, and how many are on the shelf.
// Everyone who may see stock can open this page; only people who manage products can add or open a product.
function ProductsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useUser();
  const canManage = can('manageProducts');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(searchParams.get('lowStock') === 'true');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState('');

  // The Overview's "Low stock" card links here with ?lowStock=true,
  // and the Categories page links here with ?category=Name
  useEffect(() => {
    setLowOnly(searchParams.get('lowStock') === 'true');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  useEffect(() => {
    listProducts()
      .then((data) => setProducts(data.products || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, brand, SKU or category"
          className={`${inputClass} sm:max-w-xs`}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${inputClass} sm:max-w-[12rem]`}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {brands.length > 0 && (
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={`${inputClass} sm:max-w-[12rem]`}
            aria-label="Filter by brand"
          >
            <option value="">All brands</option>
            {brands.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

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
        <EmptyState message="No products match your search." />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          // only people who manage products can open one (that page is where products are edited)
          onRowClick={canManage ? (p) => router.push(`/dashboard/products/${p._id}`) : undefined}
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
