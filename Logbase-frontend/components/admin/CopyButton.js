'use client';

import { useState } from 'react';
import { secondaryButtonClass } from '@/components/ui';

// Copies some text (a referral code, a sign-up link) and says so for a moment.
export default function CopyButton({ text, children = 'Copy', className = '' }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // older browsers: select the text in a hidden box and copy that
      try {
        const box = document.createElement('textarea');
        box.value = text;
        box.style.position = 'fixed';
        box.style.opacity = '0';
        document.body.appendChild(box);
        box.select();
        document.execCommand('copy');
        document.body.removeChild(box);
      } catch {
        return;
      }
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  return (
    <button type="button" onClick={copy} className={`${secondaryButtonClass} ${className}`}>
      {done ? 'Copied' : children}
    </button>
  );
}
