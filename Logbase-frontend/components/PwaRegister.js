'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa';

// Starts the offline support when the app opens. It shows nothing.
export default function PwaRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
