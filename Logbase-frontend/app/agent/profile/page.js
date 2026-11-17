'use client';

import { useRef, useState } from 'react';
import { ErrorBanner, Field, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { changePassword, deleteMyPhoto, updateMe, uploadMyPhoto } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { useUser } from '@/components/UserProvider';
import { useAgent } from '@/components/agent/AgentData';
import CopyButton from '@/components/admin/CopyButton';
import { Card } from '@/components/agent/parts';

const MAX_PHOTO_MB = 5;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// The big round picture. With no photo it shows the first letter; the camera button adds or changes the photo.
function BigAvatar({ name, photoUrl, busy, onPick }) {
  const input = useRef(null);
  return (
    <div className="relative h-28 w-28 sm:h-32 sm:w-32">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={`${name}’s photo`} className="h-full w-full rounded-full object-cover shadow-lg ring-4 ring-white" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-5xl font-semibold text-white shadow-lg ring-4 ring-white">
          {(name || '?').charAt(0).toUpperCase()}
        </span>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} aria-label="Choose a photo" />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current && input.current.click()}
        aria-label={photoUrl ? 'Change your photo' : 'Add your photo'}
        className="absolute bottom-0.5 right-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md ring-4 ring-white transition hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
      </button>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-3 py-3 text-center">
      <p className="tabular text-base font-semibold text-gray-900 sm:text-lg">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
    </div>
  );
}

export default function AgentProfilePage() {
  const { user, updateUser, logout } = useUser();
  const { data } = useAgent();
  const { agent, totals, desk } = data;

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoProblem, setPhotoProblem] = useState('');

  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsProblem, setDetailsProblem] = useState('');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordProblem, setPasswordProblem] = useState('');

  async function pickPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoProblem('');
    if (!PHOTO_TYPES.includes(file.type)) return setPhotoProblem('Choose a JPG, PNG or WebP picture.');
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return setPhotoProblem(`That picture is too big. Choose one under ${MAX_PHOTO_MB} MB.`);
    setPhotoBusy(true);
    try {
      const result = await uploadMyPhoto(file);
      updateUser({ photoUrl: result.user.photoUrl });
      notifySuccess('Photo saved', 'Your new picture is up.');
    } catch (err) {
      setPhotoProblem(err.message || 'The photo could not be saved');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoProblem('');
    setPhotoBusy(true);
    try {
      await deleteMyPhoto();
      updateUser({ photoUrl: '' });
      notifySuccess('Photo removed');
    } catch (err) {
      setPhotoProblem(err.message || 'The photo could not be removed');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function saveDetails(e) {
    e.preventDefault();
    setDetailsProblem('');
    setSavingDetails(true);
    try {
      const result = await updateMe({ name, phone });
      updateUser({ name: result.user.name, phone: result.user.phone });
      notifySuccess('Saved', 'Your details are updated.');
    } catch (err) {
      setDetailsProblem(err.message || 'Your details could not be saved');
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordProblem('');
    if (next !== again) return setPasswordProblem('The two new passwords are not the same.');
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setAgain('');
      notifySuccess('Password changed', 'Use the new one the next time you log in.');
    } catch (err) {
      setPasswordProblem(err.message || 'The password could not be changed');
    } finally {
      setSavingPassword(false);
    }
  }

  const detailsChanged = name.trim() !== (user.name || '') || phone.trim() !== (user.phone || '');

  return (
    <div className="space-y-5">
      {/* identity */}
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="brand-gradient relative h-32 sm:h-40">
          <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
            aria-hidden="true"
          />
        </div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-14 sm:-mt-16">
            <BigAvatar name={user.name} photoUrl={user.photoUrl} busy={photoBusy} onPick={pickPhoto} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{user.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{agent.rankName}</span>
            <span className="text-xs text-gray-500">ID {agent.agentNo || '—'}</span>
            {user.createdAt && <span className="text-xs text-gray-400">· Joined {formatDate(user.createdAt)}</span>}
          </div>
          <p className="mt-1 break-all text-sm text-gray-500">{user.email}</p>

          {user.photoUrl && !photoBusy && (
            <button type="button" onClick={removePhoto} className="mt-3 text-xs font-medium text-gray-500 underline hover:text-red-600">
              Remove photo
            </button>
          )}
          {photoProblem ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{photoProblem}</p> : <p className="mt-3 text-xs text-gray-400">Tap the camera to add your photo. JPG, PNG or WebP, up to {MAX_PHOTO_MB} MB.</p>}

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Shops" value={totals.shops} />
            <Tile label="Activated" value={totals.activated} />
            <Tile label="Earned" value={formatMoney(totals.earned)} />
            <Tile label="Your share" value={`${agent.rate}%`} />
          </div>
        </div>
      </section>

      {/* code */}
      <Card title="Your referral code">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-2xl font-bold tracking-[0.18em] text-gray-900">{agent.code}</p>
          <CopyButton text={agent.code}>Copy code</CopyButton>
        </div>
      </Card>

      {/* details */}
      <Card title="Your details">
        <form onSubmit={saveDetails} className="space-y-4">
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} className={inputClass} autoComplete="name" />
          </Field>
          <Field label="Phone number" hint="Shops see it when you write to them.">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className={inputClass} inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" />
          </Field>
          <Field label="Email" hint="This is what you log in with, and shops reply to it. To change it, ask the Programme Desk.">
            <input value={user.email} readOnly disabled className={inputClass} />
          </Field>
          <ErrorBanner message={detailsProblem} />
          <button type="submit" disabled={savingDetails || !detailsChanged} className={primaryButtonClass}>
            {savingDetails ? 'Saving…' : 'Save details'}
          </button>
        </form>
      </Card>

      {/* security */}
      <Card title="Password">
        <form onSubmit={savePassword} className="space-y-4">
          <Field label="Current password">
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={inputClass} />
          </Field>
          <Field label="New password" hint="At least 8 characters. Do not use your name or email in it.">
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="New password again">
            <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <ErrorBanner message={passwordProblem} />
          <button type="submit" disabled={savingPassword} className={primaryButtonClass}>
            {savingPassword ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </Card>

      {/* help and sign out */}
      <Card title="Need help?">
        <p className="text-sm text-gray-600">The Programme Desk answers questions about payments, shops and your code.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {desk && desk.phone && (
            <a href={`tel:${desk.phone}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark">
              Call {desk.phone}
            </a>
          )}
          <a href={`mailto:${desk ? desk.email : 'support@mylogbase.com'}`} className={secondaryButtonClass}>
            {desk ? desk.email : 'support@mylogbase.com'}
          </a>
        </div>
      </Card>

      <button type="button" onClick={logout} className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50">
        Log out
      </button>
    </div>
  );
}
