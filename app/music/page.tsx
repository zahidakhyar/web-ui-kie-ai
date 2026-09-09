'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { MixBuilder } from '@/components/music/MixBuilder';
import { MixLibrary } from '@/components/music/MixLibrary';
import { MusicForm } from '@/components/music/MusicForm';
import { TrackLibrary } from '@/components/music/TrackLibrary';
import type { MixDto } from '@/components/music/MixLibrary';
import { Spinner } from '@/components/ui/spinner';

const POLL_MS = 5000;

interface TaskState {
  status: 'waiting' | 'success' | 'fail';
  errorMsg: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MusicPage() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [mixId, setMixId] = useState<string | null>(null);

  // SWR owns the polling loop and its teardown; no manual interval to clean up.
  useSWR<TaskState>(taskId ? `/api/music/task/${taskId}` : null, fetcher, {
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
  });

  // Same shape as the generation poll: SWR owns the interval and its teardown.
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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Music</h1>
        <p className="text-sm text-muted-foreground">
          Generate a loopable track. Longer videos are assembled from these in a later step.
        </p>
      </header>

      <MusicForm onTaskCreated={setTaskId} disabled={taskId !== null} />

      {taskId && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Generating — usually about 30 seconds.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Library</h2>
        <TrackLibrary />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Build a long mix</h2>
        <MixBuilder onMixStarted={setMixId} />
        {mixId && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Assembling the mix…
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Mixes</h2>
        <MixLibrary />
      </section>
    </main>
  );
}
