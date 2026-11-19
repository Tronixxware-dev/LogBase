'use client';

// On the phone, the on-screen keyboard can sit on top of the field being typed in (the sign-up form's password field,
// the fields at the bottom of a pop-up...). While a field has the cursor, this keeps it in the part of the screen the
// keyboard leaves free:
//   - it scrolls the field up once the keyboard is open, and again if the app or the phone moves the page back
//     (some phones jump the page back a moment after the keyboard has opened);
//   - when the page is too short to scroll that far, it adds blank room under the form for as long as the keyboard is open.
// The store apps tell the page how tall the keyboard is ("keyboardWillShow" / "keyboardDidShow"); without that, 42% of the screen is assumed.

import { useEffect } from 'react';

const SKIP_TYPES = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image', 'hidden'];
const SETTLE_MS = 2500; // after a field gets the cursor, the page is corrected again if it slips back during this time

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

    let focused = null;
    let settleUntil = 0;
    let keyboardHeight = 0; // told by the store app; 0 = not known
    let roomBox = null; // a scrolling box we added bottom padding to: { node, original }
    let spacer = null; // blank block added at the end of the page
    let timer = null;
    let fixTimer = null;

    function keyboard() {
      const vv = window.visualViewport;
      const shrunk = Boolean(vv) && window.innerHeight - vv.height > 120; // the browser already made room for the keyboard
      const height = keyboardHeight || (shrunk ? Math.round(window.innerHeight - vv.height) : Math.round(window.innerHeight * 0.42));
      const visibleBottom = shrunk ? vv.height : window.innerHeight - height;
      return { height, visibleBottom };
    }

    function removeRoom() {
      if (roomBox) {
        roomBox.node.style.paddingBottom = roomBox.original;
        roomBox = null;
      }
      if (spacer) {
        spacer.remove();
        spacer = null;
      }
    }

    function makeRoom(box, height) {
      const room = height + 40;
      if (box) {
        if (spacer) {
          spacer.remove();
          spacer = null;
        }
        if (!roomBox || roomBox.node !== box) {
          removeRoom();
          roomBox = { node: box, original: box.style.paddingBottom };
        }
        box.style.paddingBottom = `${room}px`;
      } else {
        if (roomBox) removeRoom();
        if (!spacer) {
          spacer = document.createElement('div');
          spacer.setAttribute('aria-hidden', 'true');
          spacer.setAttribute('data-keyboard-room', '');
          document.body.appendChild(spacer);
        }
        spacer.style.cssText = `height:${room}px;flex:none;pointer-events:none`;
      }
    }

    function reveal(el) {
      if (!el || !el.isConnected) return;
      const box = scrollBox(el);
      const { height, visibleBottom } = keyboard();
      makeRoom(box, height);

      const rect = el.getBoundingClientRect();
      if (rect.bottom <= visibleBottom - 16 && rect.top >= 72) return; // already in the free part of the screen
      const wantedTop = Math.max(72, Math.min(visibleBottom * 0.3, visibleBottom - rect.height - 24));
      const top = rect.top - wantedTop;
      if (box) box.scrollBy({ top, behavior: 'instant' });
      else window.scrollBy({ top, behavior: 'instant' });
    }

    function revealSoon(delay) {
      clearTimeout(fixTimer);
      fixTimer = setTimeout(() => {
        if (focused && document.activeElement === focused) reveal(focused);
      }, delay);
    }

    function onFocusIn(event) {
      const el = event.target;
      if (!isTextField(el)) return;
      focused = el;
      settleUntil = Date.now() + SETTLE_MS;
      clearTimeout(timer);
      // the keyboard takes about a third of a second to slide up
      timer = setTimeout(() => {
        if (document.activeElement === el) reveal(el);
      }, 350);
    }

    function onFocusOut() {
      clearTimeout(timer);
      clearTimeout(fixTimer);
      // moving from one field to the next is not the end of typing: wait a moment before giving the room back
      timer = setTimeout(() => {
        if (!isTextField(document.activeElement)) {
          focused = null;
          removeRoom();
        }
      }, 250);
    }

    // the page was moved (by the phone, the app or the person): if the field has slid behind the keyboard, bring it back
    function onScroll() {
      if (!focused || Date.now() > settleUntil) return;
      const { visibleBottom } = keyboard();
      if (focused.getBoundingClientRect().bottom > visibleBottom - 8) revealSoon(60);
    }

    function onKeyboardShow(event) {
      const height = Number(event && event.keyboardHeight);
      if (height > 0) keyboardHeight = height;
      if (focused) {
        settleUntil = Date.now() + SETTLE_MS;
        revealSoon(120);
      }
    }

    function onKeyboardHide() {
      keyboardHeight = 0;
    }

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('keyboardWillShow', onKeyboardShow);
    window.addEventListener('keyboardDidShow', onKeyboardShow);
    window.addEventListener('keyboardDidHide', onKeyboardHide);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('keyboardWillShow', onKeyboardShow);
      window.removeEventListener('keyboardDidShow', onKeyboardShow);
      window.removeEventListener('keyboardDidHide', onKeyboardHide);
      clearTimeout(timer);
      clearTimeout(fixTimer);
      removeRoom();
    };
  }, []);

  return null;
}
