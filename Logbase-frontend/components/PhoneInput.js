'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES, countryFromDigits, findCountry, lengthLabel, parsePhone } from '@/lib/phone';
import { inputClass } from '@/components/ui';

// Shown before anything is typed in the search box.
const POPULAR = ['NG', 'GH', 'US', 'GB'];

function matches(country, query) {
  const q = query.trim().toLowerCase().replace(/^\+/, '');
  if (!q) return true;
  return (
    country.name.toLowerCase().includes(q) ||
    country.code.toLowerCase() === q ||
    country.dial.startsWith(q)
  );
}

// Country picker (short list + search) and a phone number box.
// The country code decides how many digits are needed.
//
// country:  country code, e.g. 'NG'
// number:   what has been typed in the number box
// onChange: called with { country, number }
export default function PhoneInput({ country, number, onChange, required = false, disabled = false }) {
  const selected = findCountry(country);
  const parsed = parsePhone(country, number);
  const showProblem = number.trim() !== '' && !parsed.valid;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);
  const searchRef = useRef(null);

  const results = useMemo(() => {
    if (query.trim() === '') return POPULAR.map((code) => COUNTRIES.find((c) => c.code === code)).filter(Boolean);
    return COUNTRIES.filter((c) => matches(c, query));
  }, [query]);

  // close when clicking elsewhere
  useEffect(() => {
    if (!open) return undefined;
    function handleClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function openList() {
    if (disabled) return;
    setQuery('');
    setHighlight(0);
    setOpen((v) => !v);
  }

  function pick(code) {
    onChange({ country: code, number });
    setOpen(false);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlight]) pick(results[highlight].code);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleNumberChange(value) {
    // Pasting a full international number (+233 24 123 4567) picks the country by itself.
    const text = value.trim();
    if (text.startsWith('+')) {
      const match = countryFromDigits(text.replace(/\D/g, ''));
      if (match) {
        onChange({ country: match.code, number: text.replace(/\D/g, '').slice(match.dial.length) });
        return;
      }
    }
    onChange({ country, number: value });
  }

  return (
    <div>
      <div className="flex gap-2">
        <div ref={boxRef} className="relative shrink-0">
          <button
            type="button"
            onClick={openList}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`Country code: ${selected.name}`}
            className={`${inputClass} flex w-28 items-center justify-between gap-2 text-left`}
          >
            <span>
              <span className="font-medium">{selected.code}</span>{' '}
              <span className="text-gray-500">+{selected.dial}</span>
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-gray-400">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {open && (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search country or code"
                className={`${inputClass} mb-2`}
                aria-label="Search countries"
              />

              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {query.trim() === '' ? 'Popular' : `${results.length} found`}
              </p>

              <ul role="listbox" className="max-h-56 overflow-y-auto">
                {results.map((c, index) => (
                  <li key={c.code} role="option" aria-selected={c.code === country}>
                    <button
                      type="button"
                      onClick={() => pick(c.code)}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${
                        index === highlight ? 'bg-gray-100' : ''
                      } ${c.code === country ? 'font-semibold text-primary' : 'text-gray-800'}`}
                    >
                      <span>{c.name}</span>
                      <span className="text-gray-500">+{c.dial}</span>
                    </button>
                  </li>
                ))}
                {results.length === 0 && <li className="px-2 py-3 text-sm text-gray-500">No country found.</li>}
              </ul>

              {query.trim() === '' && (
                <p className="px-2 pt-2 text-xs text-gray-400">Type above to search all {COUNTRIES.length} countries.</p>
              )}
            </div>
          )}
        </div>

        <input
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={`${lengthLabel(selected)} digits`}
          disabled={disabled}
          required={required}
          className={inputClass}
          aria-label="Phone number"
        />
      </div>

      <p className={`mt-1 text-xs ${showProblem ? 'text-red-600' : 'text-gray-400'}`}>
        {showProblem
          ? parsed.message
          : parsed.valid
            ? `Saved as ${parsed.e164}`
            : `${selected.name}: ${lengthLabel(selected)} digits after +${selected.dial}.`}
      </p>
    </div>
  );
}
