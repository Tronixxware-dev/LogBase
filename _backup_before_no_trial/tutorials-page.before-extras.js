'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/components/UserProvider';
import { TutorialModal, useTutorialSet } from '@/components/WatchHowButton';
import { businessTypeOf } from '@/lib/businessTypes';
import { SETS, posterUrl } from '@/lib/tutorialVideos';

// Every video tutorial for this kind of business, in the order to learn them.
export default function TutorialsPage() {
  const { user } = useUser();
  const { ids, setId, choose } = useTutorialSet(businessTypeOf(user));
  const [playing, setPlaying] = useState(null);

  if (!setId) {
    return (
      <div>
        <PageHeader title="Video tutorials" subtitle="Short videos that show you how to use LogBase." />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Videos for your kind of business are coming soon.
        </div>
      </div>
    );
  }

  const set = SETS[setId];

  return (
    <div>
      <PageHeader title="Video tutorials" subtitle="Short videos that show you how to use LogBase. Watch them in order, or pick the one you need." />

      {ids.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                id === setId ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900'
              }`}
            >
              {SETS[id].label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {set.videos.map((video, index) => (
          <button
            key={video.key}
            type="button"
            onClick={() => setPlaying(video)}
            className="group overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-xs transition hover:shadow-md active:scale-[0.99]"
          >
            <div className="relative aspect-video bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl(setId, video.key, 'wide')} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primary shadow">
                  <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true">
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </span>
              </span>
            </div>
            <div className="p-3.5">
              <p className="text-xs font-medium text-gray-400">Video {index + 1}</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">{video.title}</p>
            </div>
          </button>
        ))}
      </div>

      {playing && <TutorialModal setId={setId} videos={[playing]} onClose={() => setPlaying(null)} />}
    </div>
  );
}
