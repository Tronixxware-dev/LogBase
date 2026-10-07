'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// useLayoutEffect warns when a page is rendered on the server, where it does nothing anyway
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Counts up to a number (and from the old number to a new one) instead of jumping.
//   value:  the number to show. Anything that is not a number (like "—") is shown as it is.
//   format: turns the number into text, e.g. (n) => formatMoney(Math.round(n))
// With "reduce motion" switched on in the device settings, it just shows the number.
export default function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(), duration = 850 }) {
  const [shown, setShown] = useState(value);
  const last = useRef(null); // the number we last counted to

  useIsoLayoutEffect(() => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      setShown(value);
      return undefined;
    }
    let reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduce = false;
    }
    const from = last.current == null ? 0 : last.current;
    last.current = value;
    if (reduce || from === value || typeof requestAnimationFrame === 'undefined') {
      setShown(value);
      return undefined;
    }

    setShown(from);
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // fast at first, slow at the end
      setShown(t < 1 ? from + (value - from) * eased : value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{typeof shown === 'number' ? format(shown) : shown}</>;
}
