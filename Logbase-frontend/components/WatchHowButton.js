'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useUser } from '@/components/UserProvider';
import { businessTypeOf } from '@/lib/businessTypes';
import { posterUrl, setsForType, videosForPath, videoUrl, youtubeIdFor } from '@/lib/tutorialVideos';

function PlayIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Which set of videos this business watches. A general shop can be a supermarket or a pharmacy, so it can switch;
// the choice is remembered on this device.
export function useTutorialSet(type) {
  const ids = setsForType(type);
  const [chosen, setChosen] = useState('');
  useEffect(() => {
    try {
      setChosen(localStorage.getItem('logbase:tutorial-set') || '');
    } catch {
      // storage is not available: keep the default
    }
  }, []);
  const setId = ids.includes(chosen) ? chosen : ids[0] || '';
  const choose = (id) => {
    setChosen(id);
    try {
      localStorage.setItem('logbase:tutorial-set', id);
    } catch {
      // storage is not available: the choice just is not remembered
    }
  };
  return { ids, setId, choose };
}

// The pop-up that plays a video. `videos` is one or more videos for the page; with more than one, buttons switch between them.
export function TutorialModal({ setId, videos, startKey, onClose }) {
  const [key, setKey] = useState(startKey || (videos[0] && videos[0].key));
  const [wide, setWide] = useState(false);
  const [online, setOnline] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setWide(window.matchMedia('(min-width: 768px)').matches);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('keydown', esc);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = before;
    };
  }, [onClose]);

  const video = videos.find((v) => v.key === key) || videos[0];
  if (!video) return null;
  const shape = wide ? 'wide' : 'vertical';
  const youtube = youtubeIdFor(setId, video.key);
  const frame = { aspectRatio: wide ? '16 / 9' : '9 / 16', width: wide ? '100%' : 'min(100%, calc(70vh * 9 / 16))' };

  // drawn on the page itself (not inside the top bar, whose frosted glass would squeeze a pop-up into the bar)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Watch how</p>
            <h2 className="truncate text-lg font-semibold text-gray-900">{video.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-lg leading-none text-gray-500 transition active:scale-95"
          >
            ×
          </button>
        </div>

        <div className="mx-auto overflow-hidden rounded-xl bg-black" style={frame}>
          {!online || failed ? (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/80">
              {!online
                ? 'Connect to the internet to watch this video.'
                : 'This video could not load. Check your connection and try again.'}
            </div>
          ) : youtube ? (
            <iframe
              key={video.key}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${youtube}?rel=0&modestbranding=1&autoplay=1&playsinline=1`}
              title={video.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <video
              key={video.key + shape}
              className="h-full w-full"
              src={videoUrl(setId, video.key, shape)}
              poster={posterUrl(setId, video.key, shape)}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onError={() => setFailed(true)}
            />
          )}
        </div>

        {videos.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {videos.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  setFailed(false);
                  setKey(v.key);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  v.key === video.key ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 hover:text-gray-900'
                }`}
              >
                {v.title}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 text-right">
          <Link href="/dashboard/tutorials" onClick={onClose} className="text-sm font-medium text-primary hover:underline">
            See all video tutorials
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

// The button in the top bar. On a page that has a video it says "Watch how" and plays it;
// on any other page it is a small icon that opens the list of all tutorials. A business type with no videos gets no button.
export default function WatchHowButton() {
  const pathname = usePathname();
  const { user } = useUser();
  const { setId } = useTutorialSet(businessTypeOf(user));
  const [open, setOpen] = useState(false);

  // close the pop-up when you go to another page
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!setId) return null;
  const videos = videosForPath(setId, pathname);

  if (videos.length === 0) {
    return (
      <Link
        href="/dashboard/tutorials"
        aria-label="Video tutorials"
        title="Video tutorials"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-xs transition active:scale-95"
      >
        <PlayIcon />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Watch how"
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 text-sm font-medium text-primary shadow-xs transition active:scale-95 sm:px-3"
      >
        <PlayIcon />
        <span className="hidden sm:inline">Watch how</span>
      </button>
      {open && <TutorialModal setId={setId} videos={videos} onClose={() => setOpen(false)} />}
    </>
  );
}
