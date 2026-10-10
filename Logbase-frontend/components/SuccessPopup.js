'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeSuccess, unlockAudio } from '@/lib/feedback';

const SHOW_MS = 2600;

// The green "done" popup shown after something is saved (see lib/feedback.js). Lives in the dashboard layout so
// it stays on screen while the page behind it changes.
export default function SuccessPopup() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    const off = subscribeSuccess((m) => {
      setMessage(m);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), SHOW_MS);
    });
    return () => {
      off();
      clearTimeout(timer.current);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/25 px-6 print:hidden" aria-live="polite">
      <style>{`
        @keyframes lb-pop { 0% { transform: scale(.8); opacity: 0 } 60% { transform: scale(1.04); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes lb-ring { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes lb-tick { to { stroke-dashoffset: 0 } }
      `}</style>
      <button
        type="button"
        key={message.id}
        onClick={() => setMessage(null)}
        role="status"
        className="pointer-events-auto flex w-full max-w-xs flex-col items-center rounded-3xl bg-white px-8 pb-8 pt-9 text-center shadow-2xl ring-1 ring-black/5"
        style={{ animation: 'lb-pop .38s cubic-bezier(.2,.9,.3,1.2) both' }}
      >
        <span
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30"
          style={{ animation: 'lb-ring .4s cubic-bezier(.2,.9,.3,1.3) both' }}
        >
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="20" strokeDashoffset="20" style={{ animation: 'lb-tick .35s .25s ease-out forwards' }} />
          </svg>
        </span>
        <span className="mt-5 text-xl font-semibold text-gray-900">{message.title}</span>
        {message.detail && <span className="mt-1.5 text-sm leading-snug text-gray-500">{message.detail}</span>}
      </button>
    </div>
  );
}
