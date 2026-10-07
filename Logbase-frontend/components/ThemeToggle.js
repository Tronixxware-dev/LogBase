'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icons';
import { applyTheme, currentTheme, readStoredTheme, setTheme, systemTheme } from '@/lib/theme';

// Keeps a component in step with the theme: reads it after the page loads, follows the toggle,
// and follows the device setting for as long as nobody has picked one.
function useTheme() {
  const [theme, setThemeState] = useState(null); // null until the page has loaded (the server cannot know)

  useEffect(() => {
    setThemeState(currentTheme());
    const onChange = () => setThemeState(currentTheme());
    window.addEventListener('logbase:theme-changed', onChange);

    let media;
    const onSystem = () => {
      if (!readStoredTheme()) {
        applyTheme(systemTheme());
        onChange();
      }
    };
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', onSystem);
    } catch {
      media = null;
    }
    return () => {
      window.removeEventListener('logbase:theme-changed', onChange);
      if (media) media.removeEventListener('change', onSystem);
    };
  }, []);

  return [theme, (next) => setTheme(next)];
}

// A round icon button (top bar).
export function ThemeIconButton({ className = '' }) {
  const [theme, change] = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => change(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-xs transition hover:text-gray-900 hover:shadow-sm active:scale-95 ${className}`}
    >
      <span className="relative block h-5 w-5">
        <Icon
          name="sun"
          className={`absolute inset-0 h-5 w-5 transition duration-300 ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`}
        />
        <Icon
          name="moon"
          className={`absolute inset-0 h-5 w-5 transition duration-300 ${dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
        />
      </span>
    </button>
  );
}

// A full-width row with a switch (sidebar).
export function ThemeSwitchRow() {
  const [theme, change] = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => change(dark ? 'light' : 'dark')}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
    >
      <Icon name={dark ? 'moon' : 'sun'} className="h-5 w-5 text-gray-400" />
      <span className="flex-1 whitespace-nowrap text-left">Dark mode</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          dark ? 'bg-primary' : 'bg-gray-300'
        }`}
        aria-hidden="true"
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-[#ffffff] shadow transition-transform ${
            dark ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
