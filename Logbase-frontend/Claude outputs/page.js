'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listStaff,
  inviteStaff,
  updateStaff,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PERMISSIONS, PRESETS, DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions';
import PageHeader from '@/components/PageHeader';
import {
  ErrorBanner,
  Field,
  LoadingState,
  cardClass,
  inputClass,
  primaryButtonClass,
} from '@/components/ui';

const MIN_PASSWORD = 6;
// no 0/O or 1/l/I, so a password read out loud or copied by hand is not mixed up
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePassword(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50';

const permissionLabel = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label]));

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/* ------------------------------------------------------------------ */
/* The tick-boxes                                                      */
/* ------------------------------------------------------------------ */

function PermissionTicks({ permissions, onChange, withPresets = true }) {
  const has = (key) => permissions.includes(key);

  function toggle(key) {
    onChange(has(key) ? permissions.filter((p) => p !== key) : [...permissions, key]);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">What can they do?</span>
        {withPresets && (
          <>
            <span className="text-xs text-gray-400">Quick fill:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={secondaryButtonClass}
                onClick={() => onChange([...preset.permissions])}
              >
                {preset.label}
              </button>
            ))}
            <button type="button" className={secondaryButtonClass} onClick={() => onChange([])}>
              Clear
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PERMISSIONS.map((p) => (
          <label
            key={p.key}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
              has(p.key) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={has(p.key)}
              onChange={() => toggle(p.key)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
            />
            <span>
              <span className="block font-medium text-gray-900">{p.label}</span>
              <span className="block text-xs text-gray-500">{p.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Workers can never open the Team page, and recorded sales and purchases can never be edited by anyone.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Make or change a role: a name plus ticks. Not a <form>, because it  */
/* is also shown inside other forms.                                   */
/* ------------------------------------------------------------------ */

function RoleForm({ initialName = '', initialPermissions = [], submitLabel = 'Save role', onSave, onCancel }) {
  const [name, setName] = useState(initialName);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) {
      setError('Give the role a name, like Cashier or Night shift');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(name.trim(), permissions);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <Field label="Role name" hint="For example Cashier, Shop assistant, Night shift.">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
          maxLength={40}
          autoFocus
          className={`${inputClass} sm:max-w-xs`}
        />
      </Field>

      <PermissionTicks permissions={permissions} onChange={setPermissions} />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button type="button" disabled={busy} className={primaryButtonClass} onClick={save}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Role dropdown + tick-boxes (used when adding and when editing)      */
/* ------------------------------------------------------------------ */

// The roles to offer: the owner's own roles, then the starter roles (unless the owner made one with the same name).
function roleOptions(roles, jobTitle) {
  const saved = roles.map((r) => ({ value: r._id, name: r.name, permissions: r.permissions || [] }));
  const starters = PRESETS.filter((p) => !saved.some((s) => sameName(s.name, p.label))).map((p) => ({
    value: `starter:${p.label}`,
    name: p.label,
    permissions: p.permissions,
  }));

  const title = (jobTitle || '').trim();
  const match = title ? [...saved, ...starters].find((o) => sameName(o.name, title)) : null;
  // a label that is not one of the roles (an older worker): keep showing it instead of silently dropping it
  const current = title && !match ? { value: 'current', name: title, permissions: null } : null;

  return { saved, starters, current, selected: match || current || null };
}

function AccessEditor({ roles, jobTitle, onJobTitle, permissions, onPermissions, onRolesChanged }) {
  const [creating, setCreating] = useState(false);
  const { saved, starters, current, selected } = roleOptions(roles, jobTitle);
  const changedForThisWorker = Boolean(selected && selected.permissions && !sameSet(selected.permissions, permissions));

  function handlePick(e) {
    const value = e.target.value;
    if (value === '__new__') {
      setCreating(true);
      return;
    }
    setCreating(false);
    if (value === '') {
      onJobTitle('');
      return;
    }
    if (value === 'current') return;
    const option = [...saved, ...starters].find((o) => o.value === value);
    if (!option) return;
    onJobTitle(option.name);
    onPermissions([...option.permissions]);
  }

  async function handleCreate(name, perms) {
    const data = await createRole({ name, permissions: perms });
    await onRolesChanged().catch(() => {}); // the role is saved even if refreshing the list fails
    onJobTitle(data.role.name);
    onPermissions(data.role.permissions || perms);
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <Field
        label="Role"
        hint="Pick a role to tick its access automatically. Choose “Create a new role” to add your own."
      >
        <select
          value={creating ? '__new__' : selected ? selected.value : ''}
          onChange={handlePick}
          className={`${inputClass} sm:max-w-xs`}
        >
          <option value="">No role</option>
          {current && <option value="current">{current.name} (current)</option>}
          {saved.length > 0 && (
            <optgroup label="Your roles">
              {saved.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Starter roles">
            {starters.map((o) => (
              <option key={o.value} value={o.value}>
                {o.name}
              </option>
            ))}
          </optgroup>
          <option value="__new__">+ Create a new role…</option>
        </select>
      </Field>

      {creating ? (
        <RoleForm
          initialPermissions={permissions}
          submitLabel="Save role and use it"
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <>
          <PermissionTicks permissions={permissions} onChange={onPermissions} />
          {changedForThisWorker && (
            <p className="text-xs text-amber-700">
              These ticks differ from the “{selected.name}” role. The change is for this worker only.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The owner's saved roles                                             */
/* ------------------------------------------------------------------ */

function RolesCard({ roles, onChanged, onError }) {
  const [editing, setEditing] = useState(null); // a role id, 'new' or null
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSave(role, name, permissions) {
    onError('');
    if (role) await updateRole(role._id, { name, permissions });
    else await createRole({ name, permissions });
    await onChanged();
    setEditing(null);
  }

  async function handleDelete(role) {
    setBusy(true);
    onError('');
    try {
      await deleteRole(role._id);
      setConfirming(null);
      await onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${cardClass} mb-8 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Roles</h2>
          <p className="text-xs text-gray-500">
            Make your own roles here. They appear in the Role dropdown whenever you add a worker. Changing a role
            does not change workers who already have it. Use “Edit access” on the worker for that.
          </p>
        </div>
        {editing !== 'new' && (
          <button type="button" className={secondaryButtonClass} onClick={() => setEditing('new')}>
            + New role
          </button>
        )}
      </div>

      {editing === 'new' && (
        <div className="mt-4">
          <RoleForm
            submitLabel="Save role"
            onSave={(name, permissions) => handleSave(null, name, permissions)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {roles.length === 0 && editing !== 'new' ? (
        <p className="mt-4 text-sm text-gray-500">
          You have not made any roles yet. Cashier, Stock keeper and Manager are ready to use in the dropdown.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {roles.map((role) => (
            <li key={role._id} className="py-3">
              {editing === role._id ? (
                <RoleForm
                  initialName={role.name}
                  initialPermissions={role.permissions || []}
                  submitLabel="Save changes"
                  onSave={(name, permissions) => handleSave(role, name, permissions)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{role.name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {confirming === role._id ? (
                        <>
                          <span className="text-sm text-gray-600">Delete this role?</span>
                          <button
                            type="button"
                            disabled={busy}
                            className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                            onClick={() => handleDelete(role)}
                          >
                            {busy ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button type="button" className={secondaryButtonClass} onClick={() => setConfirming(null)}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            onClick={() => {
                              setConfirming(null);
                              setEditing(role._id);
                            }}
                          >
                            Edit
                          </button>
                          <button type="button" className={secondaryButtonClass} onClick={() => setConfirming(role._id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(role.permissions || []).length === 0 ? (
                      <span className="text-xs text-gray-400">No access ticked.</span>
                    ) : (
                      role.permissions.map((key) => (
                        <span key={key} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {permissionLabel[key] || key}
                        </span>
                      ))
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One worker in the list                                              */
/* ------------------------------------------------------------------ */

function WorkerRow({ worker, roles, onChanged, onRolesChanged, onError }) {
  const [mode, setMode] = useState(null); // null | 'password' | 'access'
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState(worker.jobTitle || '');
  const [permissions, setPermissions] = useState(worker.permissions || []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function run(payload, afterOk) {
    setBusy(true);
    onError('');
    setNotice('');
    try {
      await updateStaff(worker.id, payload);
      if (afterOk) afterOk();
      await onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleReset(e) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      onError(`The new password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    run({ password }, () => {
      setNotice(`Password changed. Tell ${worker.name} their new password: ${password}`);
      setPassword('');
      setMode(null);
    });
  }

  function handleSaveAccess(e) {
    e.preventDefault();
    run({ jobTitle, permissions }, () => {
      setNotice('Access saved. It applies the next time they open a page.');
      setMode(null);
    });
  }

  function open(next) {
    setNotice('');
    if (next === 'access') {
      // start from what is saved, not from an abandoned edit
      setJobTitle(worker.jobTitle || '');
      setPermissions(worker.permissions || []);
    }
    setMode((m) => (m === next ? null : next));
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">
            {worker.name}
            {worker.jobTitle && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">
                {worker.jobTitle}
              </span>
            )}
          </p>
          <p className="truncate text-sm text-gray-500">{worker.email}</p>
          <p className="text-xs text-gray-400">Added {formatDate(worker.createdAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              worker.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {worker.isActive ? 'Active' : 'Switched off'}
          </span>
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => open('access')}>
            Edit access
          </button>
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => open('password')}>
            Reset password
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={busy}
            onClick={() => run({ isActive: !worker.isActive })}
          >
            {worker.isActive ? 'Switch off' : 'Switch on'}
          </button>
        </div>
      </div>

      {/* what they may do */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(worker.permissions || []).length === 0 ? (
          <span className="text-xs text-gray-400">No access yet. They can sign in but cannot open anything.</span>
        ) : (
          worker.permissions.map((key) => (
            <span key={key} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {permissionLabel[key] || key}
            </span>
          ))
        )}
      </div>

      {mode === 'access' && (
        <form onSubmit={handleSaveAccess} className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <AccessEditor
            roles={roles}
            jobTitle={jobTitle}
            onJobTitle={setJobTitle}
            permissions={permissions}
            onPermissions={setPermissions}
            onRolesChanged={onRolesChanged}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? 'Saving…' : 'Save access'}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setMode(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'password' && (
        <form onSubmit={handleReset} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <Field label="New password">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={() => setPassword(generatePassword())}>
            Generate
          </button>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      )}

      {notice && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export default function TeamPage() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', password: '', jobTitle: '' });
  const [permissions, setPermissions] = useState([...DEFAULT_WORKER_PERMISSIONS]);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // sign-in details of the worker just added, shown once

  const load = useCallback(async () => {
    const data = await listStaff();
    setStaff(data.staff || []);
  }, []);

  const loadRoles = useCallback(async () => {
    const data = await listRoles();
    setRoles(data.roles || []);
  }, []);

  useEffect(() => {
    // the roles are a convenience: if they fail to load, the starter roles still work
    Promise.all([load(), loadRoles().catch(() => {})])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load, loadRoles]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreated(null);

    if (!form.name.trim() || !form.email.trim()) {
      setError('Enter the worker’s name and email address');
      return;
    }
    if (form.password.length < MIN_PASSWORD) {
      setError(`The password must be at least ${MIN_PASSWORD} characters`);
      return;
    }

    setSaving(true);
    try {
      const data = await inviteStaff({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        jobTitle: form.jobTitle.trim(),
        permissions,
      });
      setCreated({ name: data.user.name, email: data.user.email, password: form.password });
      setForm({ name: '', email: '', password: '', jobTitle: '' });
      setPermissions([...DEFAULT_WORKER_PERMISSIONS]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Team"
        subtitle="Add workers, give each a role, and tick exactly what they may do. You can change it any time, and it applies straight away."
      />

      <ErrorBanner message={error} />

      {created && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
          <p className="font-medium">{created.name} can now sign in.</p>
          <p className="mt-2">
            Email: <span className="font-mono font-semibold">{created.email}</span>
          </p>
          <p>
            Password: <span className="font-mono font-semibold">{created.password}</span>
          </p>
          <p className="mt-2 text-xs text-green-700">
            Write these down or send them to your worker now. For safety the password is not shown again, but you
            can set a new one any time with “Reset password”.
          </p>
        </div>
      )}

      <form onSubmit={handleCreate} className={`${cardClass} mb-8 space-y-5 p-5`}>
        <h2 className="text-sm font-semibold text-gray-900">Add a worker</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Email" hint="They sign in with this email.">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              autoComplete="off"
              className={inputClass}
              required
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <Field label="Password" hint={`At least ${MIN_PASSWORD} characters.`}>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                autoComplete="off"
                className={inputClass}
                required
              />
            </Field>
          </div>
          <button
            type="button"
            className={`${secondaryButtonClass} mb-5`}
            onClick={() => setField('password', generatePassword())}
          >
            Generate
          </button>
        </div>

        <AccessEditor
          roles={roles}
          jobTitle={form.jobTitle}
          onJobTitle={(v) => setField('jobTitle', v)}
          permissions={permissions}
          onPermissions={setPermissions}
          onRolesChanged={loadRoles}
        />

        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? 'Adding…' : 'Add worker'}
        </button>
      </form>

      <RolesCard roles={roles} onChanged={loadRoles} onError={setError} />

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Your workers</h2>
      {loading ? (
        <LoadingState />
      ) : staff.length === 0 ? (
        <p className="text-sm text-gray-500">No workers yet. Add one above.</p>
      ) : (
        <ul className={`${cardClass} divide-y divide-gray-100`}>
          {staff.map((worker) => (
            <WorkerRow
              key={worker.id}
              worker={worker}
              roles={roles}
              onChanged={load}
              onRolesChanged={loadRoles}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
