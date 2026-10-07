'use client';

import { useState } from 'react';
import { deleteProductImage, uploadProductImages } from '@/lib/api';

const MAX_PHOTOS = 6;

// Photo grid for one product, with an "+ Add photos" tile.
// Used on the product page and while recording a sale.
//
// product:     the product object (needs _id, name, images)
// onChange:    called with the updated product after an upload or delete
// allowDelete: show the × button on each photo
// compact:     smaller thumbnails (for the sale form)
export default function ProductGallery({ product, onChange, allowDelete = false, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const images = product.images || [];

  async function handleFileChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > MAX_PHOTOS) {
      setError(`A product can have at most ${MAX_PHOTOS} photos.`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const data = await uploadProductImages(product._id, files);
      onChange(data.product);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(publicId) {
    setError('');
    try {
      const data = await deleteProductImage(product._id, publicId);
      onChange(data.product);
    } catch (err) {
      setError(err.message);
    }
  }

  const grid = compact ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4';

  return (
    <div>
      <div className={`grid gap-3 ${grid}`}>
        {images.map((img) => (
          <div
            key={img.publicId || img.url}
            className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200"
          >
            <img src={img.url} alt={product.name} className="h-full w-full object-cover" />
            {img.isCover && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-white">
                Cover
              </span>
            )}
            {allowDelete && (
              <button
                type="button"
                onClick={() => handleDelete(img.publicId)}
                aria-label="Delete photo"
                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white transition sm:opacity-0 sm:group-hover:opacity-100"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {images.length < MAX_PHOTOS && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-1 text-center text-xs text-gray-400 transition hover:border-primary hover:text-primary">
            {uploading ? 'Uploading…' : '+ Add photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {images.length} of {MAX_PHOTOS} photos
        {images.length === 0 ? '. The first one you add becomes the cover photo.' : '.'}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
