import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { runFfmpeg } from '@/lib/audio/ffmpeg';
import { db } from '@/lib/db';
import { uploadBuffer } from '@/lib/r2';
import { musicMixes, videoRenders } from '@/lib/schema';
import {
  CLIP_SECONDS,
  buildBoomerangArgs,
  buildClipArgs,
  buildLoopMuxArgs,
  loopsFor,
} from './clip';

/** Forward + reverse, so the loop unit is twice the clip. */
const BOOMERANG_SECONDS = CLIP_SECONDS * 2;

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

async function render(renderId: string, mixId: string, imageUrl: string) {
  const dir = await mkdtemp(path.join(tmpdir(), 'render-'));
  try {
    const mix = db.select().from(musicMixes).where(eq(musicMixes.mixId, mixId)).get();
    if (!mix?.r2Url) throw new Error('Mix is not ready');

    const image = path.join(dir, 'bg.img');
    const audio = path.join(dir, 'mix.mp3');
    await download(imageUrl, image);
    await download(mix.r2Url, audio);

    // Filter once over CLIP_SECONDS, never over the full export.
    const clip = path.join(dir, 'clip.mp4');
    await runFfmpeg(buildClipArgs(image, clip));

    const boom = path.join(dir, 'boom.mp4');
    await runFfmpeg(buildBoomerangArgs(clip, boom));

    const seconds = mix.actualSeconds ?? mix.targetSeconds;
    const out = path.join(dir, 'out.mp4');
    await runFfmpeg(
      buildLoopMuxArgs(boom, audio, loopsFor(seconds, BOOMERANG_SECONDS), out),
    );

    const r2Url = await uploadBuffer(await readFile(out), renderKey(renderId), 'video/mp4');

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

export async function startRender(mixId: string, imageUrl: string): Promise<string> {
  const renderId = randomUUID();

  db.insert(videoRenders)
    .values({ renderId, mixId, imageUrl, status: 'running', createdAt: Date.now() })
    .run();

  // Detached: a 1-hour export writes ~235 MB, far past any request timeout.
  void render(renderId, mixId, imageUrl);

  return renderId;
}
