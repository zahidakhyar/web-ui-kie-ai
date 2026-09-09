import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { musicTasks, musicTracks } from '@/lib/schema';
import { getMusicRecord } from '@/lib/suno/client';
import { reconcile } from '@/lib/suno/reconcile';
import { mirrorAudio, mirrorCover } from '@/lib/suno/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const task = db.select().from(musicTasks).where(eq(musicTasks.taskId, taskId)).get();
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const readTracks = () =>
    db.select().from(musicTracks).where(eq(musicTracks.taskId, taskId)).all();

  // Terminal states are already reconciled; never re-query or re-upload.
  if (task.status === 'success') {
    return NextResponse.json({ status: 'success', errorMsg: null, tracks: readTracks() });
  }
  if (task.status === 'fail') {
    return NextResponse.json({ status: 'fail', errorMsg: task.errorMsg, tracks: [] });
  }

  try {
    const outcome = reconcile(await getMusicRecord(taskId));

    if (outcome.kind === 'pending') {
      return NextResponse.json({ status: 'waiting', errorMsg: null, tracks: [] });
    }

    if (outcome.kind === 'failed') {
      db.update(musicTasks)
        .set({ status: 'fail', errorMsg: outcome.errorMsg, completedAt: Date.now() })
        .where(eq(musicTasks.taskId, taskId))
        .run();
      return NextResponse.json({ status: 'fail', errorMsg: outcome.errorMsg, tracks: [] });
    }

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
        .run();
    }

    db.update(musicTasks)
      .set({ status: 'success', completedAt: Date.now() })
      .where(eq(musicTasks.taskId, taskId))
      .run();

    return NextResponse.json({ status: 'success', errorMsg: null, tracks: readTracks() });
  } catch (error) {
    // Terminal, per the spec's failed+retry decision. Returning 'waiting' here
    // would make the client poll forever, since it only stops on success/fail.
    const message = error instanceof Error ? error.message : 'Unknown error';
    db.update(musicTasks)
      .set({ status: 'fail', errorMsg: message, completedAt: Date.now() })
      .where(eq(musicTasks.taskId, taskId))
      .run();
    return NextResponse.json({ status: 'fail', errorMsg: message, tracks: [] });
  }
}
