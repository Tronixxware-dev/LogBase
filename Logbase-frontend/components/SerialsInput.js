'use client';

import { useId, useState } from 'react';
import { addSerials } from '@/lib/serials';
import { inputClass } from '@/components/ui';

// Enter IMEI / serial numbers one by one (a scanner types a number and presses Enter) or paste a whole list.
// `expected` is how many are needed (a sale needs one per unit); leave it out when any number is fine.
export default function SerialsInput({ value, onChange, expected, suggestions = [], disabled = false, label = 'IMEI / serial numbers' }) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const listId = useId();

  function commit(raw) {
    if (!raw || !raw.trim()) return;
    const { list, rejected } = addSerials(value, raw);
    if (list.length !== value.length) onChange(list);
    setText('');
    setNotice(
      rejected.length === 0
        ? ''
        : `${rejected
            .slice(0, 2)
            .map((r) => `"${r.text}" ${r.reason}`)
            .join('; ')}${rejected.length > 2 ? ` (and ${rejected.length - 2} more)` : ''}`
    );
  }

  function remove(serial) {
    onChange(value.filter((s) => s !== serial));
    setNotice('');
  }

  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 200);
  const countOk = expected === undefined || value.length === expected;

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          list={unused.length > 0 ? listId : undefined}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            // a comma or space ends a number (typing "123 456" gives two numbers)
            if (/[,;\s]$/.test(next) && next.trim()) commit(next);
            else setText(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // never submits the form: a scanner presses Enter after every number
              commit(text);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData && e.clipboardData.getData('text');
            if (pasted && /[\s,;]/.test(pasted.trim())) {
              e.preventDefault();
              commit(`${text} ${pasted}`);
            }
          }}
          onBlur={() => commit(text)}
          placeholder="Scan or type, then press Enter"
          className={inputClass}
          aria-label={label}
        />
        <button
          type="button"
          disabled={disabled || !text.trim()}
          onClick={() => commit(text)}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {unused.length > 0 && (
        <datalist id={listId}>
          {unused.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}

      {notice && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {notice}
        </p>
      )}

      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((serial) => (
            <li key={serial} className="inline-flex items-center gap-1 rounded-md bg-gray-100 py-0.5 pl-2 pr-1 font-mono text-xs text-gray-800">
              {serial}
              {!disabled && (
                <button type="button" onClick={() => remove(serial)} aria-label={`Remove ${serial}`} className="rounded px-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700">
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {expected !== undefined && (
        <p className={`mt-1 text-xs ${countOk ? 'text-green-700' : 'text-gray-500'}`}>
          {value.length} of {expected} entered
        </p>
      )}
    </div>
  );
}
