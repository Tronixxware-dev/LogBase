'use client';

import { useEffect, useState } from 'react';

const FLAG = 'logbase-debuglayout';

const r = (n) => Math.round(n);
const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`;
const box = (el) => {
  const b = el.getBoundingClientRect();
  return `top ${r(b.top + window.scrollY)} h ${r(b.height)}`;
};

// A temporary readout for finding what pushes the page down on phones.
// It only appears after the page is opened once with ?debuglayout=1, and never for anyone else.
export default function LayoutDebug() {
  const [lines, setLines] = useState(null);

  useEffect(() => {
    let on = false;
    try {
      if (new URLSearchParams(window.location.search).has('debuglayout')) sessionStorage.setItem(FLAG, '1');
      on = sessionStorage.getItem(FLAG) === '1';
    } catch (e) {
      on = new URLSearchParams(window.location.search).has('debuglayout');
    }
    if (!on) return undefined;

    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(probe);

    const measure = () => {
      const vv = window.visualViewport;
      const out = [];
      out.push(`win ${window.innerWidth}x${window.innerHeight} dpr ${window.devicePixelRatio}`);
      if (vv) out.push(`visual h ${r(vv.height)} offTop ${r(vv.offsetTop)} pageTop ${r(vv.pageTop)} scale ${vv.scale}`);
      out.push(`scrollY ${r(window.scrollY)} docH ${document.documentElement.scrollHeight}`);
      out.push(`safe top ${getComputedStyle(probe).paddingTop} bottom ${getComputedStyle(probe).paddingBottom}`);
      out.push(`pointer coarse ${window.matchMedia('(pointer: coarse)').matches}`);
      const header = document.querySelector('header');
      if (header) out.push(`header ${box(header)} pos ${getComputedStyle(header).position}`);
      const main = document.querySelector('main');
      if (main) {
        out.push(`main ${box(main)} padTop ${getComputedStyle(main).paddingTop}`);
        Array.from(main.children).forEach((c) => {
          out.push(` > ${label(c)} ${box(c)}`);
          if (c.children.length === 1) out.push(`   >> ${label(c.children[0])} ${box(c.children[0])}`);
        });
      }
      const h1 = document.querySelector('main h1');
      if (h1) out.push(`h1 top ${r(h1.getBoundingClientRect().top + window.scrollY)}`);
      out.push(`keyboard spacers ${document.querySelectorAll('[data-keyboard-room]').length}`);
      Array.from(document.body.children).forEach((c) => {
        if (c !== probe && c.getBoundingClientRect().height > 0) out.push(`body > ${label(c)} h ${r(c.getBoundingClientRect().height)}`);
      });
      setLines(out);
    };

    measure();
    const id = setInterval(measure, 1000);
    return () => {
      clearInterval(id);
      probe.remove();
    };
  }, []);

  if (!lines) return null;
  return (
    <pre
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        margin: 0,
        padding: '6px 8px',
        maxHeight: '48vh',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.94)',
        color: '#000',
        font: '10px/1.3 monospace',
        whiteSpace: 'pre-wrap',
        pointerEvents: 'none',
      }}
    >
      {lines.join('\n')}
    </pre>
  );
}
