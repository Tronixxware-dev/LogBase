// The "done" feedback after something is saved: a short success popup and a soft chime.
// Call notifySuccess('Product added', 'Rice (50kg bag)') right after a save (and before moving to another page).
// The popup itself is drawn by <SuccessPopup /> in the dashboard layout, which stays mounted while the person
// moves from page to page, so it still shows after the redirect.

const listeners = new Set();
let pending = null; // a popup asked for before the layout was ready (for example right after signing up)
let audioCtx = null;

function soundOn() {
  try {
    return window.localStorage.getItem('logbase_sound') !== 'off';
  } catch {
    return true;
  }
}

function context() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

// Phones only let a page make sound after the person has touched it once. This is called on the first touch.
export function unlockAudio() {
  const ctx = context();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

// A soft two-note "ding-ding" chime.
export function playDone() {
  if (!soundOn()) return;
  const ctx = context();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const start = ctx.currentTime + 0.02;
    [
      { f: 880, t: 0, len: 0.5 },
      { f: 1318.5, t: 0.13, len: 0.8 },
    ].forEach(({ f, t, len }) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      overtone.type = 'triangle';
      osc.frequency.value = f;
      overtone.frequency.value = f * 2;
      const at = start + t;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.28, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
      const mix = ctx.createGain();
      mix.gain.value = 0.18;
      osc.connect(gain);
      overtone.connect(mix);
      mix.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      overtone.start(at);
      osc.stop(at + len + 0.05);
      overtone.stop(at + len + 0.05);
    });
  } catch {
    // sound is only a nicety
  }
}

export function notifySuccess(title, detail) {
  playDone();
  const message = { title: title || 'Done', detail: detail || '', id: Date.now() + Math.random() };
  if (listeners.size === 0) {
    pending = message;
    return;
  }
  listeners.forEach((fn) => fn(message));
}

export function subscribeSuccess(fn) {
  listeners.add(fn);
  if (pending) {
    const message = pending;
    pending = null;
    setTimeout(() => fn(message), 150);
  }
  return () => listeners.delete(fn);
}
