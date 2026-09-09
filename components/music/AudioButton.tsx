'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * One <audio> may play at a time across the whole page. Eight independently
 * playable players is a bug in an audio tool, not a styling preference.
 */
let current: HTMLAudioElement | null = null;

export function AudioButton({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () =>
      setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      if (current === el) current = null;
    };
  }, []);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    // Pause the other player BEFORE starting this one. Pausing an element whose
    // play() promise is still pending rejects with AbortError, so the exclusive
    // switch has to happen here rather than inside the 'play' event handler.
    if (current && current !== el) current.pause();
    current = el;
    el.play().catch((error: DOMException) => {
      // Autoplay policy or a fast re-toggle; neither is actionable.
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') throw error;
    });
  }

  return (
    <div className="flex items-center gap-3">
      <audio ref={ref} src={src} loop preload="none" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition active:scale-[0.94] hover:bg-accent"
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
      </button>
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
