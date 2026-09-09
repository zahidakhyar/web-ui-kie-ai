import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { musicTasks, musicTracks } from '@/lib/schema';
import { getMusicRecord } from './client';
import { reconcile } from './reconcile';
import { mirrorAudio, mirrorCover } from './storage';

export interface TaskView {
  status: 'waiting' | 'success' | 'fail';
  errorMsg: string | null;
  tracks: (typeof musicTracks.$inferSelect)[];
}

/** Give up on tasks older than this; Suno's own probe latency is ~30s. */
const STALE_AFTER_MS = 30 * 60 * 1000;

function readTracks(taskId: string) {
  return db.select().from(musicTracks).where(eq(musicTracks.taskId, taskId)).all();
}

function markFailed(taskId: string, errorMsg: string): TaskView {
  db.update(musicTasks)
    .set({ status: 'fail', errorMsg, completedAt: Date.now() })
    .where(eq(musicTasks.taskId, taskId))
    .run();
  return { status: 'fail', errorMsg, tracks: [] };
}

/**
 * Queries Suno for one task and persists whatever it finds. Safe to call
 * repeatedly: terminal tasks short-circuit, so nothing is re-downloaded.
 */
export async function syncTask(taskId: string): Promise<TaskView | null> {
  const task = db.select().from(musicTasks).where(eq(musicTasks.taskId, taskId)).get();
  if (!task) return null;

  if (task.status === 'success') {
    return { status: 'success', errorMsg: null, tracks: readTracks(taskId) };
  }
  if (task.status === 'fail') {
    return { status: 'fail', errorMsg: task.errorMsg, tracks: [] };
  }

  try {
    const outcome = reconcile(await getMusicRecord(taskId));

    if (outcome.kind === 'pending') {
      if (Date.now() - task.createdAt > STALE_AFTER_MS) {
        return markFailed(taskId, 'Timed out waiting for Suno.');
      }
      return { status: 'waiting', errorMsg: null, tracks: [] };
    }

    if (outcome.kind === 'failed') return markFailed(taskId, outcome.errorMsg);

    for (const track of outcome.tracks) {
      const audioR2Url = await mirrorAudio(track.audioUrl, taskId, track.id);
      const coverR2Url = track.imageUrl
        ? await mirrorCover(track.imageUrl, taskId, track.id)
        : null;

      db.insert(musicTracks)
        .values({
          taskId,
          audioId: track.id,
          title: track.title,
          durationSec: track.duration,
          audioR2Url,
          audioOriginalUrl: track.audioUrl,
          coverR2Url,
          createdAt: Date.now(),
        })
        .onConflictDoNothing()
        .run();
    }

    db.update(musicTasks)
      .set({ status: 'success', completedAt: Date.now() })
      .where(eq(musicTasks.taskId, taskId))
      .run();

    return { status: 'success', errorMsg: null, tracks: readTracks(taskId) };
  } catch (error) {
    // Terminal, per the failed+retry decision. Staying 'waiting' would make the
    // client poll forever, since it only stops on success/fail.
    return markFailed(taskId, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Picks up tasks the client stopped polling — a closed tab, a reload, or a
 * throttled background tab. Without this the route-as-poller design orphans
 * them in `waiting` forever even though Suno already finished.
 */
export async function syncPendingTasks(): Promise<void> {
  const pending = db
    .select({ taskId: musicTasks.taskId })
    .from(musicTasks)
    .where(
      and(
        eq(musicTasks.status, 'waiting'),
        gt(musicTasks.createdAt, Date.now() - STALE_AFTER_MS),
      ),
    )
    .all();

  await Promise.all(pending.map((t) => syncTask(t.taskId)));
}
