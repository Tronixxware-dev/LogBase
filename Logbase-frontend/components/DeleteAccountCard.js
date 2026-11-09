'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteMyAccount, clearToken } from '@/lib/api';
import { cacheClear, outboxAll, outboxDelete } from '@/lib/offline';
import { useUser } from '@/components/UserProvider';
import { ErrorBanner, Field, cardClass, inputClass } from '@/components/ui';

// Delete your account from inside the app (Apple and Google both require this to be possible).
// The owner deletes the whole business; a staff deletes only their own login.
export default function DeleteAccountCard() {
  const { isOwner } = useUser();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = password.length > 0 && (!isOwner || confirm.trim().toUpperCase() === 'DELETE');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await deleteMyAccount({ password, ...(isOwner ? { confirm } : {}) });
      // the login page shows "account deleted" (even if another request notices the missing login first and sends us there)
      try {
        sessionStorage.setItem('logbase_account_deleted', '1');
      } catch {
        /* the address below carries the same message */
      }
      // nothing of this account is left on the server, so clear what this phone kept for it too
      try {
        const waiting = await outboxAll();
        for (const entry of waiting) await outboxDelete(entry.id);
        await cacheClear();
      } catch {
        /* the saved copy could not be cleared; signing out below still ends the session */
      }
      clearToken();
      window.location.replace('/login?deleted=1');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className={`${cardClass} mt-6 border-red-200 p-6`}>
      <h2 className="text-lg font-medium text-red-700">Delete account</h2>
      <p className="mt-1 text-sm text-gray-600">
        {isOwner
          ? 'Permanently delete your business and everything in it.'
          : 'Permanently delete your own login.'}
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Delete my account…
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {isOwner ? (
              <>
                <p className="font-medium">This cannot be undone.</p>
                <p className="mt-1">
                  All your products, sales, purchases, customers, expenses, repairs, photos and every staff login will be deleted, and nobody will be able to sign in to this business again. Only records of plan payments are kept, as far as the law and accounting require.
                </p>
                <p className="mt-2">
                  Want a copy first? <Link href="/dashboard/data" className="font-medium underline">Export your data</Link> before you continue.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">This cannot be undone.</p>
                <p className="mt-1">
                  Your login will be removed and you will not be able to sign in again. Sales and other records you made stay in the business&apos;s history. To delete the whole business, the owner has to do it.
                </p>
              </>
            )}
          </div>

          <ErrorBanner message={error} />

          <Field label="Your password" hint="We ask for it to make sure it is really you.">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
            />
          </Field>

          {isOwner && (
            <Field label="Type DELETE to confirm">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                className={inputClass}
                placeholder="DELETE"
              />
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!ready || busy}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? 'Deleting…' : isOwner ? 'Delete my business forever' : 'Delete my login forever'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPassword('');
                setConfirm('');
                setError('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
