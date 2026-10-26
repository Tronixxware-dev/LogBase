'use client';

import { useRef, useState } from 'react';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import { Icon } from '@/components/Icons';
import { SettingsSection, Toggle, SavedNote } from '@/components/SettingsParts';
import { ErrorBanner, Field, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { saveOrganization, uploadLogo, deleteLogo } from '@/lib/api';
import { DEFAULT_CLOSING } from '@/lib/settings';
import { sampleDoc } from '@/lib/receiptDoc';
import ReceiptPaper from '@/components/ReceiptPaper';
import { notifySuccess } from '@/lib/feedback';

const MAX_LOGO = 3 * 1024 * 1024;

// A picture of how a receipt will look with the choices made so far (the same paper as every receipt and slip)
function ReceiptPreview({ org }) {
  return (
    <div className="py-3">
      <ReceiptPaper doc={sampleDoc(org)} org={org} name={org.name || 'Your business'} />
    </div>
  );
}

function OrganizationForm() {
  const { settings, updateUser, user } = useUser();
  const org = settings.organization;
  const [name, setName] = useState(org.name);
  const [phone, setPhone] = useState(org.phone);
  const [address, setAddress] = useState(org.address);
  const [website, setWebsite] = useState(org.website);
  const [taxId, setTaxId] = useState(org.taxId);
  const [receipt, setReceipt] = useState(org.receipt);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef(null);

  // the saved settings (and the business name used across the menus) come back from the server
  function adopt(fresh) {
    updateUser({ settings: { ...user.settings, ...fresh }, businessName: fresh.organization.name });
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (!name.trim()) return setError('The business name cannot be empty');
    setSaving(true);
    try {
      const data = await saveOrganization({ name, phone, address, website, taxId, receipt });
      adopt(data.settings);
      setSaved(true);
      notifySuccess('Business details saved', 'Receipts and slips use them from now on');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function pickLogo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Choose a JPG, PNG or WebP picture');
    if (file.size > MAX_LOGO) return setError('The logo must be smaller than 3 MB');
    setLogoBusy(true);
    try {
      const data = await uploadLogo(file);
      adopt(data.settings);
      notifySuccess('Logo saved', 'It shows on your receipts');
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setError('');
    setLogoBusy(true);
    try {
      const data = await deleteLogo();
      adopt(data.settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  const setR = (changes) => {
    setSaved(false);
    setReceipt((r) => ({ ...r, ...changes }));
  };
  const live = { ...org, name, phone, address, website, taxId, receipt };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Organization" subtitle="Your business details. They appear on receipts, job slips and statements." backHref="/dashboard/settings" backLabel="Back to settings" />
      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={save}>
          <SettingsSection title="Logo" description="A square or wide picture with a clear background looks best. JPG, PNG or WebP, up to 3 MB." icon="building">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {org.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logoUrl} alt="Your logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Icon name="upload" className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickLogo} className="sr-only" aria-label="Choose a logo picture" />
                <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={logoBusy} className={secondaryButtonClass}>
                  <Icon name="upload" className="h-4 w-4" />
                  {logoBusy ? 'Working…' : org.logoUrl ? 'Change logo' : 'Upload logo'}
                </button>
                {org.logoUrl && (
                  <button type="button" onClick={removeLogo} disabled={logoBusy} className={`${secondaryButtonClass} text-red-600`}>
                    <Icon name="trash" className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Business details" icon="note">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Business name">
                  <input type="text" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setSaved(false); }} className={inputClass} required />
                </Field>
              </div>
              <Field label="Business email" hint="This is the email your business signed up with.">
                <input type="email" value={org.email} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} />
              </Field>
              <Field label="Business phone">
                <input type="tel" value={phone} maxLength={30} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} placeholder="+234 801 234 5678" className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input type="text" value={address} maxLength={200} onChange={(e) => { setAddress(e.target.value); setSaved(false); }} placeholder="Shop number, street, city" className={inputClass} />
                </Field>
              </div>
              <Field label="Website (optional)">
                <input type="text" value={website} maxLength={120} onChange={(e) => { setWebsite(e.target.value); setSaved(false); }} placeholder="www.yourshop.com" className={inputClass} />
              </Field>
              <Field label="Tax number (optional)" hint="Printed on receipts when you add one.">
                <input type="text" value={taxId} maxLength={40} onChange={(e) => { setTaxId(e.target.value); setSaved(false); }} className={inputClass} />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection title="On the receipt" description="Choose what your customers see at the top and bottom of a receipt." icon="note">
            <div className="divide-y divide-gray-100">
              <Toggle label="Show my logo" hint="Needs a logo above." checked={receipt.showLogo} onChange={(v) => setR({ showLogo: v })} />
              <Toggle label="Show my address" checked={receipt.showAddress} onChange={(v) => setR({ showAddress: v })} />
              <Toggle label="Show my phone number" checked={receipt.showPhone} onChange={(v) => setR({ showPhone: v })} />
              <Toggle label="Show who served the customer" hint="The staff who recorded the sale." checked={receipt.showSeller} onChange={(v) => setR({ showSeller: v })} />
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Closing line (optional)" hint={`${(receipt.closing || '').length}/80. Leave it empty to print "${DEFAULT_CLOSING}".`}>
                <input type="text" value={receipt.closing || ''} maxLength={80} placeholder={DEFAULT_CLOSING} onChange={(e) => setR({ closing: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Message at the bottom (optional)" hint={`${receipt.footer.length}/200. For example: Goods sold are not returnable after 7 days.`}>
                <textarea value={receipt.footer} maxLength={200} rows={2} onChange={(e) => setR({ footer: e.target.value })} className={inputClass} />
              </Field>
            </div>
          </SettingsSection>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <SavedNote show={saved} />
          </div>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">How a receipt will look</p>
          <ReceiptPreview org={live} />
        </aside>
      </div>
    </div>
  );
}

// (only the administrator can open this page: RoleGuard in the dashboard layout turns everyone else away)
export default function OrganizationPage() {
  return <OrganizationForm />;
}
