'use client';

import { useRef, useState } from 'react';
import {
  updateMe,
  changePassword,
  uploadMyPhoto,
  deleteMyPhoto,
  uploadMyCover,
  deleteMyCover,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import CoverBanner from '@/components/CoverBanner';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

const MIN_PASSWORD = 6;
const MAX_PHOTO_MB = 5;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50';

function SuccessNote({ message }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
      {message}
    </p>
  );
}

// Add / change / remove one picture (the round photo or the wide cover). A staff can add theirs once; after that
// only the administrator can change it, so the buttons are replaced by a short note (the server enforces it too).
function PictureControls({ kind, url, locked, upload, remove, onSaved }) {
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const noun = kind === 'cover' ? 'cover picture' : 'photo';

  async function choose(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // so choosing the same picture again still triggers
    if (!file) return;
    setError('');
    setDone('');

    if (!PHOTO_TYPES.includes(file.type)) {
      setError('Choose a JPG, PNG or WebP picture');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`The picture is too big. Choose one under ${MAX_PHOTO_MB} MB.`);
      return;
    }

    setBusy(true);
    try {
      const data = await upload(file);
      onSaved(kind === 'cover' ? data.user.coverUrl : data.user.photoUrl);
      setDone(`Your ${noun} is saved.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeIt() {
    setError('');
    setDone('');
    setBusy(true);
    try {
      await remove();
      onSaved('');
      setDone(`Your ${noun} is removed.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {locked ? (
          <span className="text-xs text-gray-500">
            Your {noun} is set. Only the administrator can change it.
          </span>
        ) : (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={choose}
              className="hidden"
              aria-label={`Choose a ${noun}`}
            />
            <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => fileInput.current?.click()}>
              {busy ? 'Please wait…' : url ? `Change ${noun}` : `Add ${noun}`}
            </button>
            {url && !busy && (
              <button type="button" className={`${secondaryButtonClass} text-red-600`} onClick={removeIt}>
                Remove {noun}
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {done && <p role="status" className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{done}</p>}
    </div>
  );
}

// Your own profile: the details you may change, what you are allowed to do, and your password.
// Everyone (owner and staff) can open it from the name at the bottom of the menu.
export default function ProfilePage() {
  const { user, updateUser, isOwner } = useUser();

  /* ---------------- details ---------------- */
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [businessName, setBusinessName] = useState(user.businessName || '');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsDone, setDetailsDone] = useState('');

  async function saveDetails(e) {
    e.preventDefault();
    setDetailsError('');
    setDetailsDone('');

    if (!name.trim()) {
      setDetailsError('Enter your name');
      return;
    }
    if (isOwner && !businessName.trim()) {
      setDetailsError('Enter the business name');
      return;
    }

    setSavingDetails(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim() };
      if (isOwner) payload.businessName = businessName.trim();
      const data = await updateMe(payload);
      updateUser(data.user); // the menu shows the new name straight away
      setName(data.user.name);
      setPhone(data.user.phone || '');
      if (isOwner) setBusinessName(data.user.businessName || businessName.trim());
      setDetailsDone('Your details are saved.');
    } catch (err) {
      setDetailsError(err.message);
    } finally {
      setSavingDetails(false);
    }
  }

  /* ---------------- password ---------------- */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordDone, setPasswordDone] = useState('');

  async function savePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordDone('');

    if (!currentPassword) {
      setPasswordError('Enter your current password');
      return;
    }
    if (newPassword.length < MIN_PASSWORD) {
      setPasswordError(`The new password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The two new passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDone('Password changed. Use the new one the next time you sign in.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  const passwordType = showPasswords ? 'text' : 'password';
  const ownPermissions = PERMISSIONS.filter((p) => (user.permissions || []).includes(p.key));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" subtitle="Your details, what you can do in LogBase, and your password." />

      {/* who you are: cover picture across the top, round photo overlapping it */}
      <div className={`${cardClass} mb-6 overflow-hidden`}>
        <CoverBanner url={user.coverUrl} />

        <div className="px-5 pb-5">
          {/* the white backing and ring keep the photo (or letter) readable where it overlaps the cover */}
          <div
            style={{
              marginTop: -40,
              width: 'fit-content',
              borderRadius: '9999px',
              background: '#ffffff',
              boxShadow: '0 0 0 4px #ffffff',
              position: 'relative',
            }}
          >
            <Avatar name={user.name} photoUrl={user.photoUrl} size="lg" tone="primary" />
          </div>
          <div className="mt-3 min-w-0">
            <p className="truncate text-lg font-semibold text-gray-900">{user.name}</p>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
            <p className="mt-1 text-xs text-gray-400">
              {isOwner ? 'Administrator' : user.jobTitle || 'Staff'}
              {user.businessName ? ` · ${user.businessName}` : ''}
              {user.createdAt ? ` · Joined ${formatDate(user.createdAt)}` : ''}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Profile photo</p>
              <PictureControls
                kind="photo"
                url={user.photoUrl}
                locked={!isOwner && Boolean(user.photoUrl)}
                upload={uploadMyPhoto}
                remove={deleteMyPhoto}
                onSaved={(photoUrl) => updateUser({ photoUrl })}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Cover picture</p>
              <PictureControls
                kind="cover"
                url={user.coverUrl}
                locked={!isOwner && Boolean(user.coverUrl)}
                upload={uploadMyCover}
                remove={deleteMyCover}
                onSaved={(coverUrl) => updateUser({ coverUrl })}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">JPG, PNG or WebP, up to {MAX_PHOTO_MB} MB each.</p>
        </div>
      </div>

      {/* details */}
      <form onSubmit={saveDetails} className={`${cardClass} mb-6 space-y-4 p-5`}>
        <h2 className="text-sm font-semibold text-gray-900">Your details</h2>
        <ErrorBanner message={detailsError} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Phone number" hint="Optional.">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              autoComplete="tel"
              className={inputClass}
            />
          </Field>
          <Field label="Email" hint="You sign in with this email, so it can’t be changed here.">
            <input type="email" value={user.email || ''} readOnly disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
          </Field>
          <Field
            label="Business name"
            hint={isOwner ? 'Shown at the top of the menu for everyone in the business.' : 'Only the administrator can change this.'}
          >
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={80}
              readOnly={!isOwner}
              disabled={!isOwner}
              className={`${inputClass} ${isOwner ? '' : 'bg-gray-50 text-gray-500'}`}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={savingDetails} className={primaryButtonClass}>
            {savingDetails ? 'Saving…' : 'Save changes'}
          </button>
          <SuccessNote message={detailsDone} />
        </div>
      </form>

      {/* what you can do */}
      <div className={`${cardClass} mb-6 p-5`}>
        <h2 className="text-sm font-semibold text-gray-900">What you can do</h2>
        {isOwner ? (
          <p className="mt-2 text-sm text-gray-600">
            You are the administrator, so you can do everything in LogBase, including seeing costs, delivery fees and profit,
            and managing your staffs.
          </p>
        ) : ownPermissions.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">The administrator has not given you any access yet.</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-gray-400">The administrator decides this. Ask them if you need more access.</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ownPermissions.map((p) => (
                <li key={p.key} className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm font-medium text-gray-800">{p.label}</p>
                  <p className="text-xs text-gray-500">{p.hint}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* password */}
      <form onSubmit={savePassword} className={`${cardClass} mb-8 space-y-4 p-5`}>
        <h2 className="text-sm font-semibold text-gray-900">Change password</h2>
        <ErrorBanner message={passwordError} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 sm:max-w-sm">
            <Field label="Current password">
              <input
                type={passwordType}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
            <input
              type={passwordType}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type={passwordType}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Show passwords
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={savingPassword} className={primaryButtonClass}>
            {savingPassword ? 'Changing…' : 'Change password'}
          </button>
          <SuccessNote message={passwordDone} />
        </div>
      </form>
    </div>
  );
}
