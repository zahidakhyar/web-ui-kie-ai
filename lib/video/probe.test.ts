import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runFfmpeg } from '@/lib/audio/ffmpeg';
import { parseProbeSeconds, probeSeconds } from './probe';

describe('parseProbeSeconds', () => {
  it('reads the duration ffprobe prints', () => {
    expect(parseProbeSeconds('7.000000\n')).toBe(7);
  });

  it('throws on N/A rather than yielding NaN into the loop count', () => {
    expect(() => parseProbeSeconds('N/A\n')).toThrow(/duration/i);
  });
});

describe('probeSeconds', () => {
  let dir: string;
  let clip: string;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'probe-test-'));
    clip = path.join(dir, 'two.mp4');
    await runFfmpeg([
      '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=2',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-y', clip,
    ]);
  });

  afterAll(() => rm(dir, { recursive: true, force: true }));

  it('measures a real file instead of trusting the requested length', async () => {
    expect(await probeSeconds(clip)).toBeCloseTo(2, 1);
  });
});
