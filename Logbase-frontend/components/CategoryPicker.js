'use client';

import { useEffect, useState } from 'react';
import { createCategory, listCategories } from '@/lib/api';
import { inputClass } from '@/components/ui';

// Dropdown of the business's categories with an inline "+ New category" box.
// A category created here is saved, so it shows up next time too (and on the Categories page).
//
// value:    the selected category name ('' for none)
// onChange: called with the category name
export default function CategoryPicker({ value, onChange }) {
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listCategories()
      .then((data) => setCategories(data.categories || []))
      .catch((err) => setError(err.message));
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      const data = await createCategory(name);
      const category = data.category;
      setCategories((prev) =>
        prev.some((c) => c._id === category._id)
          ? prev
          : [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
      );
      onChange(category.name);
      setNewName('');
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const known = categories.some((c) => c.name === value);

  return (
    <div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">No category</option>
        {value && !known && <option value={value}>{value}</option>}
        {categories.map((c) => (
          <option key={c._id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setAdding((v) => !v)}
        className="mt-1 text-xs text-primary hover:text-primary-dark"
      >
        {adding ? 'Cancel' : '+ New category'}
      </button>

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="e.g. Dresses"
            maxLength={60}
            autoFocus
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !newName.trim()}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? '…' : 'Add'}
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
