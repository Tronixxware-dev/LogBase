'use client';

import { useEffect, useMemo, useState } from 'react';

// Choose several photos on a form. They are only picked here (with previews) and get uploaded
// when the form is saved.
//
// files:    array of File objects
// onChange: called with the new array of files
// max:      most photos allowed
// hint:     small text under the grid
export default function PhotosPicker({ files, onChange, max = 6, disabled = false, hint = '' }) {
  const [notice, setNotice] = useState('');

  // preview URLs for the chosen files; released when the list changes
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  function handleChange(e) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = '';
    if (chosen.length === 0) return;

    const room = max - files.length;
    setNotice(chosen.length > room ? `Only ${max} photos are allowed, so some were left out.` : '');
    onChange([...files, ...chosen.slice(0, Math.max(room, 0))]);
  }

  function remove(index) {
    setNotice('');
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {previews.map((p, index) => (
          <div
            key={`${p.file.name}-${p.file.lastModified}-${index}`}
            className="relative aspect-square overflow-hidden rounded-lg border border-gray-200"
          >
            <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label="Remove photo"
              className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}

        {files.length < max && (
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
        {files.length} of {max} photos. You can pick several at once.{hint ? ` ${hint}` : ''}
      </p>
      {notice && <p className="mt-1 text-xs text-amber-600">{notice}</p>}
    </div>
  );
}
