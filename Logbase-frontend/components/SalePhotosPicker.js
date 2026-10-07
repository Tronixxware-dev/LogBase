'use client';

import PhotosPicker from '@/components/PhotosPicker';

export const MAX_SALE_PHOTOS = 8;

// Photos for the "Record a sale" form. They are saved together with the sale.
export default function SalePhotosPicker({ files, onChange, disabled = false }) {
  return (
    <PhotosPicker
      files={files}
      onChange={onChange}
      max={MAX_SALE_PHOTOS}
      disabled={disabled}
      hint="Photos can only be added now. They cannot be changed after the sale is recorded."
    />
  );
}
