'use client';

import { useEffect, useMemo, useState } from 'react';
import { createLaundryItem, deleteLaundryItem, listLaundryItems, updateLaundryItem } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { SERVICES } from '@/lib/laundry';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { ClothIcon, ClothTile } from '@/components/ClothIcon';
import { Icon } from '@/components/Icons';
import { ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

// The clothing types and their prices that the register offers, as a table with a picture for each item.
// Each item has a price for every service (Wash, Wash & iron, Iron only, Dry clean).
// Only the administrator changes them: one row at a time (Edit) or every price at once (Edit all prices).
export default function LaundryItemsPage() {
  const { isOwner } = useUser();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrices, setNewPrices] = useState({ price: '', wash_iron: '', iron: '', dry_clean: '' });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  // what is being edited: { [itemId]: { name, price, wash_iron, iron, dry_clean } }. Empty means the table is only being read.
  const [drafts, setDrafts] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    listLaundryItems()
      .then((data) => setItems(data.items || []))
      .catch((err) => {
        setError(err.message);
        setItems([]);
      });
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items || []).filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [items, search]);

  async function add(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!newName.trim()) return setError('Enter the name of the clothing item');
    setAdding(true);
    try {
      const data = await createLaundryItem({ name: newName.trim(), ...payloadOf(newPrices) });
      setItems((prev) => [...prev, data.item]);
      setNewName('');
      setNewPrices({ price: '', wash_iron: '', iron: '', dry_clean: '' });
      setNotice(`${data.item.name} added`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  const startEdit = (item) => setDrafts((prev) => ({ ...prev, [item._id]: draftOf(item) }));
  const stopEdit = (id) =>
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const change = (id, changes) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...changes } }));

  function isChanged(item) {
    const d = drafts[item._id];
    if (!d) return false;
    if (d.name.trim() !== item.name || (Number(d.price) || 0) !== (item.price || 0)) return true;
    return SERVICES.slice(1).some((s) => (Number(d[s.value]) || 0) !== ((item.prices && item.prices[s.value]) || 0));
  }

  async function saveOne(item) {
    const d = drafts[item._id];
    if (!d) return;
    setError('');
    setNotice('');
    setBusyId(item._id);
    try {
      const data = await updateLaundryItem(item._id, { name: d.name.trim(), ...payloadOf(d) });
      setItems((prev) => prev.map((i) => (i._id === item._id ? data.item : i)));
      stopEdit(item._id);
      setNotice(`${data.item.name} saved`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  // every open row that was changed, one after the other; the first problem stops it and is shown
  async function saveAll() {
    setError('');
    setNotice('');
    setSavingAll(true);
    let saved = 0;
    try {
      for (const item of items) {
        if (!isChanged(item)) continue;
        const d = drafts[item._id];
        const data = await updateLaundryItem(item._id, { name: d.name.trim(), ...payloadOf(d) });
        setItems((prev) => prev.map((i) => (i._id === item._id ? data.item : i)));
        saved += 1;
      }
      setDrafts({});
      setNotice(saved === 0 ? 'Nothing was changed' : saved === 1 ? '1 item saved' : `${saved} items saved`);
    } catch (err) {
      setError(`${err.message}${saved > 0 ? ` (${saved} saved before this)` : ''}`);
    } finally {
      setSavingAll(false);
    }
  }

  async function remove(item) {
    setError('');
    setNotice('');
    setBusyId(item._id);
    try {
      await deleteLaundryItem(item._id);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      stopEdit(item._id);
      setNotice(`${item.name} removed. Orders already recorded keep its name.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  if (items === null) return <LoadingState />;

  const priced = items.filter((i) => i.price > 0).length;
  const editingCount = Object.keys(drafts).length;
  const changedCount = items.filter(isChanged).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Items & prices"
        subtitle="These are the rows of your laundry register. Each price is what one piece costs for that service. Leave a service empty if you do not offer it for that item."
        backHref="/dashboard/laundry"
        backLabel="Back to laundry"
      />

      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {!isOwner && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Only the administrator can change this list.</p>}

      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="relative w-full sm:w-72">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              aria-label="Search items"
              className={`${inputClass} !pl-10`}
            />
          </div>
          <p className="text-sm text-gray-500">
            <span className="font-semibold tabular text-gray-900">{items.length}</span> items
            {priced < items.length && <span className="text-amber-700"> · {items.length - priced} without a wash price yet</span>}
          </p>
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {editingCount > 0 && (
                <>
                  <button type="button" onClick={saveAll} disabled={savingAll || changedCount === 0} className={primaryButtonClass}>
                    {savingAll ? 'Saving…' : changedCount > 0 ? `Save ${changedCount} change${changedCount === 1 ? '' : 's'}` : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setDrafts({})} disabled={savingAll} className={secondaryButtonClass}>
                    Cancel
                  </button>
                </>
              )}
              {editingCount === 0 && (
                <button
                  type="button"
                  onClick={() => setDrafts(Object.fromEntries(items.map((i) => [i._id, draftOf(i)])))}
                  className={secondaryButtonClass}
                >
                  Edit all prices
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`${cardClass} mb-6 overflow-hidden`}>
        {items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No items yet. Add your first one below.</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No item matches your search.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b-2 border-gray-300 bg-gray-100 text-left">
              <tr className="text-xs font-bold uppercase tracking-wide text-gray-700">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-3 py-3">Item</th>
                {SERVICES.map((sv) => (
                  <th key={sv.value} className="px-3 py-3 text-right">
                    {sv.label}
                  </th>
                ))}
                {isOwner && <th className="w-44 px-3 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shown.map((item, index) => (
                <ItemRow
                  key={item._id}
                  number={index + 1}
                  item={item}
                  editable={isOwner}
                  draft={drafts[item._id]}
                  bulk={editingCount > 1}
                  changed={isChanged(item)}
                  busy={busyId === item._id || savingAll}
                  onEdit={() => startEdit(item)}
                  onCancel={() => stopEdit(item._id)}
                  onChange={(changes) => change(item._id, changes)}
                  onSave={() => saveOne(item)}
                  onRemove={() => remove(item)}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {isOwner && (
        <form onSubmit={add} className={`${cardClass} space-y-4 p-6`}>
          <h2 className="text-lg font-medium text-gray-900">Add an item</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
            <div className="hidden sm:block">
              <p className="mb-1.5 text-sm font-medium text-gray-700">Picture</p>
              <span className="flex h-[2.6rem] w-[2.6rem] items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClothIcon name={newName} className="h-6 w-6" />
              </span>
            </div>
            <Field label="Name">
              <input type="text" maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SERVICES.map((sv) => (
              <Field key={sv.value} label={`${sv.label} (₦)`}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newPrices[sv.value === 'wash' ? 'price' : sv.value]}
                  onChange={(e) => setNewPrices((prev) => ({ ...prev, [sv.value === 'wash' ? 'price' : sv.value]: e.target.value }))}
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            The picture follows the name (a name with &ldquo;shirt&rdquo; in it gets the shirt, &ldquo;towel&rdquo; the towel, and so on). Anything else gets a hanger.
          </p>
          <button type="submit" disabled={adding} className={primaryButtonClass}>
            {adding ? 'Adding…' : 'Add item'}
          </button>
        </form>
      )}
    </div>
  );
}

function ItemRow({ number, item, editable, draft, bulk, changed, busy, onEdit, onCancel, onChange, onSave, onRemove }) {
  const [confirm, setConfirm] = useState(false);
  const editing = Boolean(draft);
  const tile = <ClothTile name={editing ? draft.name : item.name} size="lg" />;

  const priceFor = (sv) => (sv === 'wash' ? item.price : item.prices && item.prices[sv]) || 0;
  const draftKey = (sv) => (sv === 'wash' ? 'price' : sv);

  return (
    <tr className={editing ? 'bg-primary/[0.03]' : 'hover:bg-gray-50/60'}>
      <td className="px-4 py-3 align-middle font-semibold text-gray-500">{number}</td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-3">
          {tile}
          {editing ? (
            <input
              type="text"
              maxLength={60}
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              aria-label={`Name of ${item.name}`}
              className={`${inputClass} min-w-0`}
            />
          ) : (
            <span className="min-w-0 font-medium text-gray-900">{item.name}</span>
          )}
        </div>
      </td>
      {SERVICES.map((sv) => (
        <td key={sv.value} className="px-3 py-3 text-right align-middle tabular">
          {editing ? (
            <input
              type="number"
              min="0"
              step="any"
              value={draft[draftKey(sv.value)]}
              onChange={(e) => onChange({ [draftKey(sv.value)]: e.target.value })}
              aria-label={sv.value === 'wash' ? `Price of ${item.name}` : `${sv.label} price of ${item.name}`}
              placeholder="0"
              className={`${inputClass} ml-auto !w-24 text-right`}
            />
          ) : priceFor(sv.value) > 0 ? (
            <span className="font-medium text-gray-900">{formatMoney(priceFor(sv.value))}</span>
          ) : sv.value === 'wash' ? (
            <span className="text-amber-700">No price yet</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      ))}
      {editable && (
        <td className="px-3 py-3 text-right align-middle">
          <RowActions editing={editing} bulk={bulk} changed={changed} busy={busy} confirm={confirm} setConfirm={setConfirm} onEdit={onEdit} onCancel={onCancel} onSave={onSave} onRemove={onRemove} align="end" />
        </td>
      )}
    </tr>
  );
}

function RowActions({ editing, bulk, changed, busy, confirm, setConfirm, onEdit, onCancel, onSave, onRemove, align }) {
  const wrap = `flex items-center gap-3 ${align === 'end' ? 'justify-end' : ''}`;
  if (confirm) {
    return (
      <div className={`${wrap} text-xs`}>
        <button type="button" disabled={busy} onClick={onRemove} className="font-medium text-red-600 hover:underline">
          Yes, remove
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="text-gray-500 hover:underline">
          Keep
        </button>
      </div>
    );
  }
  if (editing) {
    return (
      <div className={wrap}>
        {!bulk && (
          <button
            type="button"
            disabled={busy || !changed}
            onClick={onSave}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-40"
          >
            Save
          </button>
        )}
        <button type="button" onClick={onCancel} disabled={busy} className="text-sm text-gray-500 hover:underline">
          {bulk ? 'Undo' : 'Cancel'}
        </button>
        <button type="button" onClick={() => setConfirm(true)} className="text-xs text-red-600 hover:underline">
          Remove
        </button>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <button type="button" onClick={onEdit} className="text-sm font-medium text-primary hover:underline">
        Edit
      </button>
      <button type="button" onClick={() => setConfirm(true)} className="text-xs text-red-600 hover:underline">
        Remove
      </button>
    </div>
  );
}

// The values of an item in the boxes of the edit row (text, so a half-typed number stays as typed)
function draftOf(item) {
  const prices = item.prices || {};
  return {
    name: item.name,
    price: String(item.price ?? 0),
    wash_iron: String(prices.wash_iron ?? 0),
    iron: String(prices.iron ?? 0),
    dry_clean: String(prices.dry_clean ?? 0),
  };
}

// What is sent to the server for the boxes
function payloadOf(d) {
  return {
    price: Number(d.price) || 0,
    prices: { wash_iron: Number(d.wash_iron) || 0, iron: Number(d.iron) || 0, dry_clean: Number(d.dry_clean) || 0 },
  };
}
