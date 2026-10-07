'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createCategory, deleteCategory, listCategories, renameCategory } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import {
  ErrorBanner,
  LoadingState,
  EmptyState,
  ListTotal,
  cardClass,
  inputClass,
  primaryButtonClass,
} from '@/components/ui';

function CategoryRow({ category, number, onRenamed, onDeleted, onError }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) {
      setEditing(false);
      setName(category.name);
      return;
    }
    setBusy(true);
    onError('');
    try {
      const data = await renameCategory(category._id, trimmed);
      onRenamed({ ...category, name: data.category.name });
      setEditing(false);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return;
    setBusy(true);
    onError('');
    try {
      await deleteCategory(category._id);
      onDeleted(category._id);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0">
      <span className="w-6 text-sm text-gray-400">{number}</span>

      {editing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          maxLength={60}
          autoFocus
          className={`${inputClass} !w-auto min-w-0 flex-1`}
        />
      ) : (
        <Link
          href={`/dashboard/products?category=${encodeURIComponent(category.name)}`}
          className="min-w-0 flex-1 truncate font-medium text-gray-900 hover:text-primary"
        >
          {category.name}
        </Link>
      )}

      <span className="text-sm text-gray-400">
        {category.productCount} product{category.productCount === 1 ? '' : 's'}
      </span>

      {editing ? (
        <>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(category.name);
            }}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-gray-500 hover:text-primary"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </>
      )}
    </li>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    listCategories()
      .then((data) => setCategories(data.categories || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError('');
    setAdding(true);
    try {
      const data = await createCategory(name);
      if (!data.created) {
        setError(`"${data.category.name}" already exists.`);
      } else {
        setCategories((prev) =>
          [...prev, { ...data.category, productCount: 0 }].sort((a, b) => a.name.localeCompare(b.name))
        );
        setNewName('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Categories"
        subtitle="Group your products. Pick a category whenever you add a product."
      />

      <ErrorBanner message={error} />

      <form onSubmit={handleAdd} className={`${cardClass} mb-6 flex gap-2 p-4`}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name (e.g. Dresses)"
          maxLength={60}
          className={inputClass}
        />
        <button type="submit" disabled={adding || !newName.trim()} className={primaryButtonClass}>
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>

      {loading ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <EmptyState message="No categories yet. Add your first one above." />
      ) : (
        <>
        <ListTotal count={categories.length} noun="category" plural="categories" />
        <ul className={cardClass}>
          {categories.map((c, index) => (
            <CategoryRow
              key={c._id}
              number={index + 1}
              category={c}
              onError={setError}
              onRenamed={(updated) =>
                setCategories((prev) =>
                  prev.map((x) => (x._id === updated._id ? updated : x)).sort((a, b) => a.name.localeCompare(b.name))
                )
              }
              onDeleted={(id) => setCategories((prev) => prev.filter((x) => x._id !== id))}
            />
          ))}
        </ul>
        </>
      )}
    </div>
  );
}
