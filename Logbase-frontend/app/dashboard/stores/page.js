'use client';

import { useState } from 'react';
import { createShop, updateShop } from '@/lib/api';
import { notifySuccess } from '@/lib/feedback';
import { useShops } from '@/lib/shops';
import PageHeader from '@/components/PageHeader';
import { Badge, ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';

function StoreForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return setError('Give the store a name.');
    setBusy(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), address: address.trim(), phone: phone.trim() });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Store name">
          <input type="text" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="For example: Ikeja branch" className={inputClass} />
        </Field>
        <Field label="Address (optional)">
          <input type="text" value={address} maxLength={200} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone (optional)">
          <input type="tel" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" disabled={busy} onClick={onCancel} className={secondaryButtonClass}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// The stores of the business (administrator only). Every business starts with one "Main store"; add more here, then
// switch between them from the top bar and move stock between them under Products > Transfers.
export default function StoresPage() {
  const { allShops, ready, error, reload } = useShops();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function add(data) {
    const res = await createShop(data);
    await reload();
    setAdding(false);
    notifySuccess('Store added', res.shop.name);
  }

  async function save(shop, data) {
    await updateShop(shop._id, data);
    await reload();
    setEditing(null);
    notifySuccess('Store updated', data.name);
  }

  async function setOpen(shop, isActive) {
    if (busyId) return;
    if (!isActive && !window.confirm(`Close ${shop.name}? Nobody will be able to work in it until you reopen it.`)) return;
    setBusyId(shop._id);
    setActionError('');
    try {
      await updateShop(shop._id, { isActive });
      await reload();
      notifySuccess(isActive ? 'Store reopened' : 'Store closed', shop.name);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <PageHeader
        title="Stores"
        subtitle="Your shops and branches. Each one keeps its own stock; sales, purchases and stock changes are recorded against the store you are working in."
        action={
          !adding ? (
            <button type="button" onClick={() => setAdding(true)} className={primaryButtonClass}>
              + Add store
            </button>
          ) : undefined
        }
      />
      <ErrorBanner message={error || actionError} />

      {adding && (
        <div className={`${cardClass} mb-5 p-5`}>
          <p className="mb-3 text-sm font-semibold text-gray-900">New store</p>
          <StoreForm submitLabel="Add store" onSubmit={add} onCancel={() => setAdding(false)} />
        </div>
      )}

      {!ready && !error ? (
        <LoadingState />
      ) : (
        <ul className={`${cardClass} divide-y divide-gray-100`}>
          {allShops.map((shop) => (
            <li key={shop._id} className="px-5 py-4">
              {editing === shop._id ? (
                <StoreForm initial={shop} submitLabel="Save" onSubmit={(data) => save(shop, data)} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                      {shop.name}
                      {shop.isMain && <Badge tone="blue">Main store</Badge>}
                      {!shop.isActive && <Badge tone="gray">Closed</Badge>}
                    </p>
                    {(shop.address || shop.phone) && <p className="mt-0.5 text-sm text-gray-500">{[shop.address, shop.phone].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <button type="button" onClick={() => setEditing(shop._id)} className="text-sm text-primary hover:underline">
                    Edit
                  </button>
                  {!shop.isMain && (
                    <button
                      type="button"
                      disabled={busyId === shop._id}
                      onClick={() => setOpen(shop, !shop.isActive)}
                      className="text-sm text-gray-600 hover:underline disabled:opacity-50"
                    >
                      {shop.isActive ? 'Close' : 'Reopen'}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
