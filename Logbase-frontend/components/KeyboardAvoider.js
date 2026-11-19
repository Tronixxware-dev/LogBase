'use client';

// On the phone, the on-screen keyboard can sit on top of the field being typed in (the sign-up form's password field,
// the fields at the bottom of a pop-up...). When a field gets the cursor, this scrolls it up into the part of the screen
// the keyboard leaves free. If the page is too short to scroll that far, blank room is added under the form while the
// keyboard is open and taken away again afterwards.

import { useEffect } from 'react';

const SKIP_TYPES = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image', 'hidden'];

function isTextField(el) {
  if (!el || !el.tagName) return false;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') return !SKIP_TYPES.includes((el.type || 'text').toLowerCase());
  return el.isContentEditable === true;
}

// the nearest box that scrolls (a pop-up, a side panel), or null when the whole page scrolls
function scrollBox(el) {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

export default function KeyboardAvoider() {
  useEffect(() => {
    // only phones and tablets have an on-screen keyboard
    if (typeof window === 'undefined' || !window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return undefined;

    let padded = null; // { node, original }
    let timer = null;

    function removePadding() {
      if (padded) {
        padded.node.style.paddingBottom = padded.original;
        padded = null;
      }
    }

    function reveal(el) {
      const vv = window.visualViewport;
      const shrunk = Boolean(vv) && window.innerHeight - vv.height > 120; // the browser already made room for the keyboard
      const visibleBottom = shrunk ? vv.height : Math.round(window.innerHeight * 0.58); // otherwise assume it covers the lower 42%
      const box = scrollBox(el);

      // room to scroll into: only needed when the keyboard is not already shrinking the page
      if (!shrunk) {
        const holder = box || document.body;
        if (!padded || padded.node !== holder) {
          removePadding();
          padded = { node: holder, original: holder.style.paddingBottom };
        }
        holder.style.paddingBottom = `${Math.round(window.innerHeight * 0.45)}px`;
      }

      const rect = el.getBoundingClientRect();
      if (rect.bottom <= visibleBottom - 16 && rect.top >= 72) return; // already in the free part of the screen
      const wantedTop = Math.max(72, Math.min(visibleBottom * 0.3, visibleBottom - rect.height - 24));
      const delta = rect.top - wantedTop;
      if (box) box.scrollBy({ top: delta, behavior: 'smooth' });
      else window.scrollBy({ top: delta, behavior: 'smooth' });
    }

    function onFocusIn(event) {
      const el = event.target;
      if (!isTextField(el)) return;
      clearTimeout(timer);
      // the keyboard takes about a third of a second to slide up
      timer = setTimeout(() => {
        if (document.activeElement === el) reveal(el);
      }, 350);
    }

    function onFocusOut() {
      clearTimeout(timer);
      // moving from one field to the next is not the end of typing: wait a moment before giving the room back
      timer = setTimeout(() => {
        if (!isTextField(document.activeElement)) removePadding();
      }, 200);
    }

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      clearTimeout(timer);
      removePadding();
    };
  }, []);

  return null;
}
