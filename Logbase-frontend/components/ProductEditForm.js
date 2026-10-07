'use client';

import BrandInput from '@/components/BrandInput';
import CategoryPicker from '@/components/CategoryPicker';
import { useUser } from '@/components/UserProvider';
import TrackingFields from '@/components/TrackingFields';
import { Field, inputClass } from '@/components/ui';

// The product's own fields (name, category, prices, stock, reorder level).
// The cost price is only shown to the owner.
// It only shows the inputs; the product page owns the values and the Save button.
//
// form:        { name, sku, brand, category, costPrice, sellingPrice, quantity, reorderThreshold, tracksSerials, warrantyMonths }
// onChange:    called with (fieldName, newValue)
// hasVariants: true when stock is tracked per colour / size
// totalStock:  total shown for products with colours / sizes
export default function ProductEditForm({ form, onChange, hasVariants, totalStock }) {
  const { isOwner } = useUser();

  function handle(e) {
    onChange(e.target.name, e.target.value);
  }

  return (
    <div className="space-y-4">
      <Field label="Product name">
        <input name="name" value={form.name} onChange={handle} required className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Brand (optional)">
          <BrandInput value={form.brand || ''} onChange={(brand) => onChange('brand', brand)} />
        </Field>
        <Field label="Category">
          <CategoryPicker value={form.category} onChange={(category) => onChange('category', category)} />
        </Field>
      </div>

      <Field label="SKU (optional)">
        <input name="sku" value={form.sku} onChange={handle} className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isOwner && (
          <Field label="Cost price (₦)">
            <input
              type="number"
              name="costPrice"
              value={form.costPrice}
              onChange={handle}
              required
              min="0"
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Selling price (₦)">
          <input
            type="number"
            name="sellingPrice"
            value={form.sellingPrice}
            onChange={handle}
            required
            min="0"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {hasVariants ? (
          <Field label="In stock" hint="Add up from the colours / sizes below.">
            <input value={totalStock} disabled className={`${inputClass} bg-gray-50`} />
          </Field>
        ) : (
          <Field label="In stock" hint="Only change this to correct a counting mistake.">
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handle}
              min="0"
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Reorder alert at">
          <input
            type="number"
            name="reorderThreshold"
            value={form.reorderThreshold}
            onChange={handle}
            min="0"
            className={inputClass}
          />
        </Field>
      </div>

      <TrackingFields form={form} onChange={onChange} />
    </div>
  );
}
