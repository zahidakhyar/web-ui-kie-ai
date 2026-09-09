'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { MusicForm } from '@/components/music/MusicForm';
import { TrackLibrary } from '@/components/music/TrackLibrary';
import { Spinner } from '@/components/ui/spinner';

const POLL_MS = 5000;

interface TaskState {
  status: 'waiting' | 'success' | 'fail';
  errorMsg: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MusicPage() {
  const [taskId, setTaskId] = useState<string | null>(null);

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
    </main>
  );
}
