'use client';

import { useEffect, useState } from 'react';

// A QR code for a link, drawn in the browser (nothing is sent anywhere). Shows nothing until it is ready.
export default function QrImage({ text, size = 176, className = '', alt = 'QR code' }) {
  const [state, setState] = useState({ text: '', src: '' });

  useEffect(() => {
    let live = true;
    import('qrcode')
      .then((mod) => (mod.default || mod).toDataURL(text, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }))
      .then((src) => {
        if (live) setState({ text, src });
      })
      .catch(() => {
        if (live) setState({ text, src: '' });
      });
    return () => {
      live = false;
    };
  }, [text, size]);

  if (state.text !== text || !state.src) return <div className={className} style={{ width: size, height: size }} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={state.src} alt={alt} width={size} height={size} className={className} />;
}
