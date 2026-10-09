'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { installKind, promptInstall, subscribeInstall } from '@/lib/pwa';

function DownloadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10.5 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function ShareIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

const STYLES = {
  // small button for the top bars
  pill: 'h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-95',
  // big button that sits next to the main buttons on the home page
  solid: 'items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3.5 text-base font-medium text-gray-800 shadow-xs transition hover:bg-gray-50',
  // a full-width row in a menu
  menu: 'flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100',
};

function IosSteps({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Install LogBase" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Install LogBase on your iPhone</h2>
        <p className="mt-1 text-sm text-gray-500">It takes three taps and gives you an icon on your home screen.</p>
        <ol className="mt-5 space-y-4 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">1</span>
            <span className="flex flex-wrap items-center gap-1.5">
              Tap the Share button <ShareIcon className="h-5 w-5 text-teal-700" /> in Safari (at the bottom or top of the screen).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">2</span>
            <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">3</span>
            <span>Tap <strong>Add</strong>. LogBase now opens like an app.</span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-gray-400">Not seeing Share? Open this page in Safari first.</p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark">
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

// An "Install app" button. It shows itself only when the app can be installed on this device (a phone or a laptop),
// and hides itself once LogBase is installed or when it is already open as the installed app.
// variant: 'pill' (top bars), 'solid' (home page) or 'menu' (a row in a menu).
export default function InstallButton({ variant = 'pill', className, label = 'Install app', onDone }) {
  const [kind, setKind] = useState(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const update = () => setKind(installKind());
    update();
    return subscribeInstall(update);
  }, []);

  useEffect(() => {
    if (!help) return undefined;
    const onKey = (e) => e.key === 'Escape' && setHelp(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [help]);

  if (!kind) return null;

  async function onClick() {
    if (kind === 'prompt') {
      await promptInstall();
      if (onDone) onDone();
    } else {
      setHelp(true);
    }
  }

  return (
    <>
      <button type="button" onClick={onClick} className={`${STYLES[variant] || STYLES.pill} ${className || (variant === 'menu' ? '' : 'inline-flex')}`} data-install-button>
        <DownloadIcon className={variant === 'solid' ? 'h-5 w-5' : 'h-4 w-4'} />
        {label}
      </button>
      {help && <IosSteps onClose={() => { setHelp(false); if (onDone) onDone(); }} />}
    </>
  );
}
