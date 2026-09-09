import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { uploadBuffer } from '@/lib/r2';
import { musicMixes, musicTracks } from '@/lib/schema';
import { buildMixArgs, runFfmpeg } from './ffmpeg';
import { planMix } from './plan';

export function mixKey(mixId: string): string {
  return `mixes/${new Date().toISOString().slice(0, 10)}/${mixId}.mp3`;
}

export function getMix(mixId: string) {
  return db.select().from(musicMixes).where(eq(musicMixes.mixId, mixId)).get() ?? null;
}

async function assemble(mixId: string, trackIds: number[], targetSeconds: number) {
  const dir = await mkdtemp(path.join(tmpdir(), 'mix-'));
  try {
    const rows = db
      .select()
      .from(musicTracks)
      .where(inArray(musicTracks.id, trackIds))
      .all();
    if (rows.length === 0) throw new Error('No tracks found for this mix');

    // Download each distinct track once; the chain reuses the local files.
    const localPath = new Map<number, string>();
    for (const row of rows) {
      const res = await fetch(row.audioR2Url);
      if (!res.ok) throw new Error(`Failed to fetch ${row.audioR2Url}: ${res.status}`);
      const file = path.join(dir, `${row.id}.mp3`);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      localPath.set(row.id, file);
    }

    // Preserve the order the caller asked for.
    const ordered = trackIds
      .map((id) => rows.find((r) => r.id === id))
      .filter((r): r is (typeof rows)[number] => r !== undefined);

    const plan = planMix(
      ordered.map((r) => localPath.get(r.id)!),
      ordered.map((r) => r.durationSec),
      targetSeconds,
    );

    const out = path.join(dir, 'mix.mp3');
    await runFfmpeg(buildMixArgs(plan, out));

    const r2Url = await uploadBuffer(await readFile(out), mixKey(mixId), 'audio/mpeg');

    db.update(musicMixes)
      .set({
        status: 'success',
        r2Url,
        actualSeconds: plan.totalSeconds,
        completedAt: Date.now(),
      })
      .where(eq(musicMixes.mixId, mixId))
      .run();
  } catch (error) {
    db.update(musicMixes)
      .set({
        status: 'fail',
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
      })
      .where(eq(musicMixes.mixId, mixId))
      .run();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function startMix(
  trackIds: number[],
  targetSeconds: number,
): Promise<string> {
  const mixId = randomUUID();

  db.insert(musicMixes)
    .values({
      mixId,
      trackIds: JSON.stringify(trackIds),
      targetSeconds,
      status: 'running',
      createdAt: Date.now(),
    })
    .run();

  // Detached: a 1-hour mix takes ~70s, far past any request timeout.
  void assemble(mixId, trackIds, targetSeconds);

  return mixId;
}
