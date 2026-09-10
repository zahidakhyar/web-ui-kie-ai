'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import { MixControls } from '@/components/music/MixControls';
import { MixLibrary, type MixDto } from '@/components/music/MixLibrary';
import { MusicForm } from '@/components/music/MusicForm';
import { Stage } from '@/components/music/Stage';
import type { MusicTrackDto } from '@/components/music/TrackCard';
import { TrackList } from '@/components/music/TrackList';
import { VideoBuilder, type ClipDto } from '@/components/music/VideoBuilder';
import { VideoLibrary, type VideoDto } from '@/components/music/VideoLibrary';
import { Spinner } from '@/components/ui/spinner';

const POLL_MS = 5000;

/** Human labels for the ffmpeg step the renderer reports. */
const STAGE_LABEL: Record<string, string> = {
  queued: 'Queued',
  downloading: 'Fetching the mix and the background',
  clip: 'Rendering the pan',
  boomerang: 'Building the seamless loop',
  muxing: 'Assembling the full video',
  uploading: 'Uploading',
};

/** The clip job talks to Veo, so its steps are its own. */
const CLIP_STAGE_LABEL: Record<string, string> = {
  queued: 'Queued',
  generating: 'Veo is generating the clip',
  upgrading: 'Upgrading to 1080p',
  looping: 'Closing the loop seam',
  uploading: 'Uploading',
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MusicPage() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [mixId, setMixId] = useState<string | null>(null);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [clipId, setClipId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const { data: trackData, isLoading: tracksLoading } = useSWR<{
    tracks: MusicTrackDto[];
  }>('/api/music/library', fetcher);
  const { data: mixData } = useSWR<{ mixes: MixDto[] }>('/api/music/mixes', fetcher);

  const tracks = trackData?.tracks ?? [];
  const readyMixes = (mixData?.mixes ?? []).filter((m) => m.status === 'success');

  // SWR owns each polling loop and its teardown; no manual intervals to clean up.
  useSWR<{ status: 'waiting' | 'success' | 'fail'; errorMsg: string | null }>(
    taskId ? `/api/music/task/${taskId}` : null,
    fetcher,
    {
      refreshInterval: POLL_MS,
      refreshWhenHidden: true,
      revalidateOnFocus: false,
      onSuccess: (task) => {
        if (task.status === 'success') {
          setTaskId(null);
          toast.success('Loop ready');
          mutate('/api/music/library');
          mutate('/api/credits');
        } else if (task.status === 'fail') {
          setTaskId(null);
          toast.error(task.errorMsg ?? 'Generation failed');
        }
      },
      onError: (error: Error) => {
        setTaskId(null);
        toast.error(error.message || 'Lost contact with the generation task');
      },
    },
  );

  useSWR<{ status: MixDto['status']; errorMsg: string | null }>(
    mixId ? `/api/music/mix/${mixId}` : null,
    fetcher,
    {
      refreshInterval: POLL_MS,
      refreshWhenHidden: true,
      revalidateOnFocus: false,
      onSuccess: (mix) => {
        if (mix.status === 'success') {
          setMixId(null);
          toast.success('Mix ready');
          mutate('/api/music/mixes');
        } else if (mix.status === 'fail') {
          setMixId(null);
          toast.error(mix.errorMsg ?? 'Mix failed');
        }
      },
      onError: (error: Error) => {
        setMixId(null);
        toast.error(error.message || 'Lost contact with the mix job');
      },
    },
  );

  const { data: clipState } = useSWR<{
    status: ClipDto['status'];
    stage: string | null;
    errorMsg: string | null;
  }>(clipId ? `/api/music/clip/${clipId}` : null, fetcher, {
    refreshInterval: POLL_MS,
    refreshWhenHidden: true,
    revalidateOnFocus: false,
    onSuccess: (clip) => {
      if (clip.status === 'success') {
        setClipId(null);
        toast.success('Clip ready');
        mutate('/api/music/clips');
        mutate('/api/credits');
      } else if (clip.status === 'fail') {
        setClipId(null);
        toast.error(clip.errorMsg ?? 'Clip generation failed');
      }
    },
    onError: (error: Error) => {
      setClipId(null);
      toast.error(error.message || 'Lost contact with the clip job');
    },
  });

  const { data: renderState } = useSWR<{
    status: VideoDto['status'];
    stage: string | null;
    errorMsg: string | null;
  }>(renderId ? `/api/music/video/${renderId}` : null, fetcher, {
    refreshInterval: POLL_MS,
    refreshWhenHidden: true,
    revalidateOnFocus: false,
    onSuccess: (render) => {
      if (render.status === 'success') {
        setRenderId(null);
        toast.success('Video ready');
        mutate('/api/music/videos');
      } else if (render.status === 'fail') {
        setRenderId(null);
        toast.error(render.errorMsg ?? 'Render failed');
      }
    },
    onError: (error: Error) => {
      setRenderId(null);
      toast.error(error.message || 'Lost contact with the render job');
    },
  });

  function toggleTrack(id: number, next: boolean) {
    setSelected((prev) => (next ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Music video</h1>
        <p className="text-sm text-muted-foreground">
          Generate a loop, stretch it into a long mix, then pair it with an image.
        </p>
      </header>

      <Stage
        index={1}
        title="Generate loops"
        hint="Each run returns two takes, about 21 seconds each."
        done={tracks.length > 0}
      >
        <div className="flex flex-col gap-6">
          <MusicForm onTaskCreated={setTaskId} disabled={taskId !== null} />
          {taskId && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Generating, usually about 30 seconds.
            </p>
          )}
          <TrackList
            tracks={tracks}
            isLoading={tracksLoading}
            selected={selected}
            onToggle={toggleTrack}
          />
        </div>
      </Stage>

      <Stage
        index={2}
        title="Build a long mix"
        hint="Selected tracks are crossfaded on repeat until the length is filled."
        locked={tracks.length === 0}
        done={readyMixes.length > 0}
      >
        <div className="flex flex-col gap-6">
          <MixControls
            selected={selected}
            selectedDurations={selected
              .map((id) => tracks.find((t) => t.id === id)?.durationSec)
              .filter((d): d is number => d !== undefined)}
            onMixStarted={setMixId}
          />
          {mixId && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Assembling the mix.
            </p>
          )}
          <MixLibrary />
        </div>
      </Stage>

      <Stage
        index={3}
        title="Render the video"
        hint="Pick a still image to pan, or generate an AI clip. Either way the visual loops under the mix."
        locked={readyMixes.length === 0}
      >
        <div className="flex flex-col gap-6">
          <VideoBuilder onRenderStarted={setRenderId} onClipStarted={setClipId} />
          {clipId && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              {CLIP_STAGE_LABEL[clipState?.stage ?? 'queued'] ?? 'Generating'}…
            </p>
          )}
          {renderId && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              {STAGE_LABEL[renderState?.stage ?? 'queued'] ?? 'Rendering'}…
            </p>
          )}
          <VideoLibrary />
        </div>
      </Stage>
    </main>
  );
}
