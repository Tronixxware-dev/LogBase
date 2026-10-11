'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icons';
import { normalizeSerial } from '@/lib/serials';

// Scan an IMEI / serial number barcode with the phone's camera.
// Uses the browser's own barcode reader when it has one (Chrome on Android, works offline) and
// falls back to a small WebAssembly reader (iPhone, Safari, desktop) that is served from /zxing_reader.wasm.

// IMEIs are printed as Code 128 (sometimes Code 39) or as a QR code. EAN / UPC are the product barcode, so skip them.
const FORMATS = ['code_128', 'code_39', 'code_93', 'codabar', 'itf', 'qr_code', 'data_matrix'];

// "IMEI: 356938035643809" or a bare number -> the number. Anything that is not a valid serial -> null.
export function pickSerial(raw) {
  const text = String(raw || '').trim();
  const imei = text.match(/(?<!\d)\d{15}(?!\d)/);
  if (imei) return imei[0];
  return normalizeSerial(text);
}

async function makeDetector() {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const formats = FORMATS.filter((f) => supported.includes(f));
      if (formats.length > 0) return new window.BarcodeDetector({ formats });
    } catch {
      // fall through to the WebAssembly reader
    }
  }
  const mod = await import('barcode-detector/ponyfill');
  mod.setZXingModuleOverrides({
    locateFile: (path, prefix) => (path.endsWith('.wasm') ? '/zxing_reader.wasm' : prefix + path),
  });
  return new mod.BarcodeDetector({ formats: FORMATS });
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1318;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch {
    // no sound is fine
  }
  try {
    if (navigator.vibrate) navigator.vibrate(60);
  } catch {
    // ignore
  }
}

function cameraError(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'LogBase cannot use the camera. Allow camera access for this site in your browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'The camera could not be started. You can still type the number.';
}

function ScannerDialog({ onClose, onScan, continuous, title }) {
  const videoRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [message, setMessage] = useState('');
  const [scanned, setScanned] = useState([]);
  const [torch, setTorch] = useState({ available: false, on: false });
  const trackRef = useRef(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let stopped = false;
    let stream = null;
    let timer = null;
    const recent = new Map(); // serial -> time, so a number held in front of the camera is added once

    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('error');
        setMessage(window.isSecureContext ? 'This browser cannot use the camera.' : 'Camera scanning needs a secure (https) connection.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        if (!stopped) {
          setStatus('error');
          setMessage(cameraError(err));
        }
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      try {
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.torch) setTorch({ available: true, on: false });
        // keep close-up barcodes sharp where the phone allows it
        if (caps.focusMode && caps.focusMode.includes('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
      } catch {
        // optional extras
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // autoplay is allowed for a muted, inline video; ignore anything else
      }

      let detector;
      try {
        detector = await makeDetector();
      } catch {
        if (!stopped) {
          setStatus('error');
          setMessage('The barcode reader could not be loaded. Check your internet connection, or type the number.');
        }
        return;
      }
      if (stopped) return;
      setStatus('scanning');

      let busy = false;
      const tick = async () => {
        if (stopped) return;
        if (!busy && video.readyState >= 2) {
          busy = true;
          try {
            const found = await detector.detect(video);
            for (const code of found) {
              const serial = pickSerial(code.rawValue);
              if (!serial) continue;
              const now = Date.now();
              if (recent.has(serial) && now - recent.get(serial) < 4000) continue;
              recent.set(serial, now);
              beep();
              onScanRef.current(serial);
              if (continuous) {
                setScanned((list) => (list.includes(serial) ? list : [serial, ...list]));
              } else {
                stopped = true;
                onClose();
                return;
              }
            }
          } catch {
            // a frame that cannot be read is skipped
          }
          busy = false;
        }
        timer = setTimeout(tick, 140);
      };
      tick();
    }

    start();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [continuous, onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function toggleTorch() {
    const next = !torch.on;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: next }] });
      setTorch({ available: true, on: next });
    } catch {
      setTorch({ available: false, on: false });
    }
  }

  const white = { color: '#fff' };
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#0b0f10', ...white }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: 'rgba(255,255,255,0.16)', ...white }}>
          {continuous ? 'Done' : 'Close'}
        </button>
      </div>

      <div className="relative mx-auto flex w-full max-w-xl flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {status === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-32 w-[82%] max-w-md rounded-2xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', border: '2px solid rgba(45,212,191,0.95)' }}>
              <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 rounded" style={{ background: 'rgba(248,113,113,0.9)' }} />
            </div>
          </div>
        )}
        {status === 'starting' && <p className="absolute text-sm" style={{ opacity: 0.8 }}>Starting the camera…</p>}
        {status === 'error' && (
          <div className="absolute inset-x-6 rounded-xl p-4 text-center text-sm" style={{ background: 'rgba(255,255,255,0.12)' }}>
            {message}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-xl px-4 pb-5 pt-3 text-center">
        {status === 'scanning' && <p className="text-sm" style={{ opacity: 0.85 }}>Point the camera at the IMEI barcode on the box or under the phone&apos;s battery or SIM tray.</p>}
        {continuous && scanned.length > 0 && (
          <p className="mt-2 text-sm font-medium" style={{ color: '#5eead4' }}>
            Added {scanned.length}: <span className="font-mono">{scanned[0]}</span>
          </p>
        )}
        {torch.available && (
          <button type="button" onClick={toggleTorch} className="mt-3 rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: 'rgba(255,255,255,0.16)', ...white }}>
            {torch.on ? 'Turn light off' : 'Turn light on'}
          </button>
        )}
      </div>
    </div>
  );
}

// A "Scan" button that opens the camera. `onScan(serial)` is called with each IMEI / serial read.
// With `continuous` the camera stays open so a whole box of phones can be scanned in one go.
export function ScanButton({ onScan, continuous = false, disabled = false, label = 'Scan', title = 'Scan IMEI / serial number', className = '' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 ${className}`}
        aria-label={title}
      >
        <Icon name="scan" className="h-4 w-4" />
        {label}
      </button>
      {/* a portal keeps the full-screen camera out of any animated page wrapper (a transformed parent would shrink "fixed") */}
      {open && createPortal(<ScannerDialog onClose={close} onScan={onScan} continuous={continuous} title={title} />, document.body)}
    </>
  );
}

export default ScanButton;
