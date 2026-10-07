'use client';

import { Field, inputClass } from '@/components/ui';
import { warrantyLabel } from '@/lib/serials';

// "Track each item by its IMEI / serial number" and the usual warranty, for phones, laptops and the like.
// form: { tracksSerials, warrantyMonths }   onChange: (fieldName, newValue)
export default function TrackingFields({ form, onChange }) {
  const months = Number(form.warrantyMonths) || 0;
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={Boolean(form.tracksSerials)}
          onChange={(e) => onChange('tracksSerials', e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">Track each item by IMEI / serial number</span>
          <span className="block text-xs text-gray-500">
            For phones, laptops and other items with a serial number. Every sale then names the exact unit, the same unit can never be sold twice, and you can look any unit up later.
          </span>
        </span>
      </label>
      <Field
        label="Usual warranty (months)"
        hint={`${months > 0 ? `Sales of this product get ${warrantyLabel(months).toLowerCase()} of warranty` : 'No warranty'} unless the seller changes it on the sale. Type 0 for none.`}
      >
        <input
          type="number"
          min="0"
          max="120"
          step="1"
          value={form.warrantyMonths}
          onChange={(e) => onChange('warrantyMonths', e.target.value)}
          className={`${inputClass} sm:max-w-[10rem]`}
        />
      </Field>
    </div>
  );
}
