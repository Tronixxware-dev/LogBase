'use client';

import { useEffect, useMemo, useState } from 'react';

// Photo gallery on the product page. Nothing is sent until the page's Save button is clicked:
//   - saved photos can be marked for removal (and un-marked),
//   - new photos are picked here and shown with previews.
//
// images:         the product's saved photos  [{ url, publicId, isCover }]
// removedIds:     publicIds marked for removal
// onToggleRemove: (publicId) mark / unmark a saved photo
// files:          new File objects waiting to be uploaded
// onFilesChange:  called with the new array of files
// max:            most photos a product can have in total
export default function ProductPhotosEditor({
  images,
  removedIds,
  onToggleRemove,
  files,
  onFilesChange,
  max = 6,
  disabled = false,
}) {
  const [notice, setNotice] = useState('');

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const kept = images.filter((img) => !removedIds.includes(img.publicId)).length;
  const total = kept + files.length;

  function handleChange(e) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = '';
    if (chosen.length === 0) return;

    const room = Math.max(max - total, 0);
    setNotice(chosen.length > room ? `A product can have at most ${max} photos, so some were left out.` : '');
    onFilesChange([...files, ...chosen.slice(0, room)]);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img) => {
          const removed = removedIds.includes(img.publicId);
          return (
            <div
              key={img.publicId || img.url}
              className={`relative aspect-square overflow-hidden rounded-lg border ${
                removed ? 'border-red-200' : 'border-gray-200'
              }`}
            >
              <img
                src={img.url}
                alt="Product"
                className={`h-full w-full object-cover ${removed ? 'opacity-30' : ''}`}
              />
              {img.isCover && !removed && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-white">
                  Cover
                </span>
              )}
              {removed ? (
                <button
                  type="button"
                  onClick={() => onToggleRemove(img.publicId)}
                  disabled={disabled}
                  className="absolute inset-0 flex items-center justify-center text-xs font-medium text-red-700"
                >
                  Removed — Undo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleRemove(img.publicId)}
                  disabled={disabled}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {previews.map((p, index) => (
          <div
            key={`${p.file.name}-${p.file.lastModified}-${index}`}
            className="relative aspect-square overflow-hidden rounded-lg border-2 border-primary"
          >
            <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
            <span className="absolute left-1 top-1 rounded bg-gray-900/70 px-1.5 py-0.5 text-[10px] text-white">
              New
            </span>
            <button
              type="button"
              onClick={() => {
                setNotice('');
                onFilesChange(files.filter((_, i) => i !== index));
              }}
              disabled={disabled}
              aria-label="Remove new photo"
              className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}

        {total < max && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-1 text-center text-xs text-gray-400 transition hover:border-primary hover:text-primary">
            + Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleChange}
              disabled={disabled}
              className="hidden"
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {total} of {max} photos. New and removed photos are applied when you click Save changes.
      </p>
      {notice && <p className="mt-1 text-xs text-amber-600">{notice}</p>}
    </div>
  );
}
