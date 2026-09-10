import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { runFfmpeg } from '@/lib/audio/ffmpeg';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/r2';
import { videoClips } from '@/lib/schema';
import { buildLoopArgs } from './loop';
import { probeSeconds } from './probe';
import {
  VEO_MODEL,
  createVeoTask,
  getVeoRecord,
  readVeoRecord,
  requestVeo1080p,
} from './veo';

const POLL_MS = 5000;
/** Measured 54s for the clip and ~35s for the upgrade; this is a wide margin. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type Stage = 'queued' | 'generating' | 'upgrading' | 'looping' | 'uploading';

export function clipKey(clipId: string): string {
  return `clips/${new Date().toISOString().slice(0, 10)}/${clipId}.mp4`;
}

export function getClip(clipId: string) {
  return db.select().from(videoClips).where(eq(videoClips.clipId, clipId)).get() ?? null;
}

function setStage(clipId: string, stage: Stage, taskId?: string) {
  db.update(videoClips)
    .set(taskId ? { stage, taskId } : { stage })
    .where(eq(videoClips.clipId, clipId))
    .run();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForVeo(taskId: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const outcome = readVeoRecord(await getVeoRecord(taskId));
    if (outcome.kind === 'ready') return outcome.url;
    if (outcome.kind === 'failed') throw new Error(outcome.errorMsg);
  }
  throw new Error('Timed out waiting for Veo.');
}

async function generate(clipId: string, prompt: string) {
  const dir = await mkdtemp(path.join(tmpdir(), 'clip-'));
  try {
    setStage(clipId, 'generating');
    const veoTaskId = await createVeoTask(prompt);
    setStage(clipId, 'generating', veoTaskId);
    await waitForVeo(veoTaskId);

    // The 1080p render is its own task with its own id, not a field on the first.
    setStage(clipId, 'upgrading');
    const upgradeTaskId = await requestVeo1080p(veoTaskId);
    setStage(clipId, 'upgrading', upgradeTaskId);
    const url = await waitForVeo(upgradeTaskId);

    const source = path.join(dir, 'source.mp4');
    await writeFile(source, Buffer.from(await (await fetch(url)).arrayBuffer()));

    setStage(clipId, 'looping');
    const loop = path.join(dir, 'loop.mp4');
    await runFfmpeg(buildLoopArgs(source, loop, await probeSeconds(source)));

    setStage(clipId, 'uploading');
    const r2Url = await uploadFile(loop, clipKey(clipId), 'video/mp4');

    db.update(videoClips)
      .set({
        status: 'success',
        r2Url,
        loopSeconds: await probeSeconds(loop),
        completedAt: Date.now(),
      })
      .where(eq(videoClips.clipId, clipId))
      .run();
  } catch (error) {
    db.update(videoClips)
      .set({
        status: 'fail',
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
      })
      .where(eq(videoClips.clipId, clipId))
      .run();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function startClip(prompt: string): string {
  const clipId = randomUUID();

  db.insert(videoClips)
    .values({
      clipId,
      prompt,
      model: VEO_MODEL,
      status: 'running',
      stage: 'queued',
      createdAt: Date.now(),
    })
    .run();

  // Detached: Veo plus the 1080p upgrade runs well past any request timeout.
  void generate(clipId, prompt);

  return clipId;
}
