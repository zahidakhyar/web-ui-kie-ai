import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { runFfmpeg } from '@/lib/audio/ffmpeg';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/r2';
import { musicMixes, videoRenders } from '@/lib/schema';
import { buildClipArgs, buildLoopMuxArgs, loopsFor } from './clip';
import { getClip } from './clip-job';
import { type LoopInput, buildLoopArgs } from './loop';
import { probeSeconds } from './probe';

/** A render pairs a mix with exactly one of these two visual sources. */
export interface RenderSource {
  imageUrl?: string | null;
  clipIds?: string[] | null;
}

export function renderKey(renderId: string): string {
  return `videos/${new Date().toISOString().slice(0, 10)}/${renderId}.mp4`;
}

export function getRender(renderId: string) {
  return (
    db.select().from(videoRenders).where(eq(videoRenders.renderId, renderId)).get() ?? null
  );
}

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

type Stage = 'queued' | 'downloading' | 'clip' | 'muxing' | 'uploading';

function setStage(renderId: string, stage: Stage) {
  db.update(videoRenders)
    .set({ stage })
    .where(eq(videoRenders.renderId, renderId))
    .run();
}

/**
 * Returns the path to a video that loops with no visible seam. AI clips are
 * chained into one, each crossfading into the next and the last back into the
 * first; a still image is panned out and back instead.
 */
async function prepareLoop(
  dir: string,
  renderId: string,
  source: RenderSource,
): Promise<string> {
  if (source.clipIds?.length) {
    const inputs: LoopInput[] = [];
    for (const [index, clipId] of source.clipIds.entries()) {
      const clip = getClip(clipId);
      if (clip?.status !== 'success' || !clip.r2Url || !clip.sourceSeconds) {
        throw new Error('Clip is not ready');
      }
      const file = path.join(dir, `clip-${index}.mp4`);
      await download(clip.r2Url, file);
      inputs.push({ path: file, seconds: clip.sourceSeconds });
    }

    setStage(renderId, 'clip');
    const loop = path.join(dir, 'loop.mp4');
    await runFfmpeg(buildLoopArgs(inputs, loop));
    return loop;
  }

  if (!source.imageUrl) throw new Error('Render has no visual source');
  const image = path.join(dir, 'bg.img');
  await download(source.imageUrl, image);

  // Filter once over one loop, never over the full export.
  setStage(renderId, 'clip');
  const clip = path.join(dir, 'clip.mp4');
  await runFfmpeg(buildClipArgs(image, clip));
  return clip;
}

async function render(renderId: string, mixId: string, source: RenderSource) {
  const dir = await mkdtemp(path.join(tmpdir(), 'render-'));
  try {
    const mix = db.select().from(musicMixes).where(eq(musicMixes.mixId, mixId)).get();
    if (!mix?.r2Url) throw new Error('Mix is not ready');

    setStage(renderId, 'downloading');
    const audio = path.join(dir, 'mix.mp3');
    await download(mix.r2Url, audio);

    const loop = await prepareLoop(dir, renderId, source);

    setStage(renderId, 'muxing');
    const seconds = mix.actualSeconds ?? mix.targetSeconds;
    const out = path.join(dir, 'out.mp4');
    // Measure the loop rather than assuming its requested length: a clip asked
    // for as 8s can encode to 7.96s, and `-shortest` would then clip the audio.
    const loops = loopsFor(seconds, await probeSeconds(loop));
    await runFfmpeg(buildLoopMuxArgs(loop, audio, loops, out));

    setStage(renderId, 'uploading');
    // Streamed, not read into the heap: an hour of AI clip is ~0.73 GB.
    const r2Url = await uploadFile(out, renderKey(renderId), 'video/mp4');

    db.update(videoRenders)
      .set({
        status: 'success',
        r2Url,
        durationSeconds: seconds,
        completedAt: Date.now(),
      })
      .where(eq(videoRenders.renderId, renderId))
      .run();
  } catch (error) {
    db.update(videoRenders)
      .set({
        status: 'fail',
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
      })
      .where(eq(videoRenders.renderId, renderId))
      .run();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function startRender(
  mixId: string,
  source: RenderSource,
): Promise<string> {
  const renderId = randomUUID();

  db.insert(videoRenders)
    .values({
      renderId,
      mixId,
      imageUrl: source.imageUrl ?? null,
      clipIds: source.clipIds?.length ? JSON.stringify(source.clipIds) : null,
      status: 'running',
      stage: 'queued',
      createdAt: Date.now(),
    })
    .run();

  // Detached: a long export writes hundreds of MB, far past any request timeout.
  void render(renderId, mixId, source);

  return renderId;
}
