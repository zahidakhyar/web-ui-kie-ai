import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/r2', () => ({ uploadBuffer: vi.fn() }));

import { uploadBuffer } from '@/lib/r2';
import { buildMusicKey, mirrorAudio } from './storage';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('buildMusicKey', () => {
  it('namespaces music under its own prefix with a date folder', () => {
    const key = buildMusicKey('t1', 'a1', 'mp3');
    expect(key).toMatch(/^music\/\d{4}-\d{2}-\d{2}\/t1_a1\.mp3$/);
  });
});

describe('mirrorAudio', () => {
  it('uploads the fetched bytes as audio/mpeg and returns the R2 url', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );
    const upload = vi.mocked(uploadBuffer).mockResolvedValue('https://r2/music/x.mp3');

    const url = await mirrorAudio('https://tempfile.example/x.mp3', 't1', 'a1');

    expect(url).toBe('https://r2/music/x.mp3');
    const [buffer, key, contentType] = upload.mock.calls[0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(key).toContain('t1_a1.mp3');
    expect(contentType).toBe('audio/mpeg');
  });

  it('throws when the source url is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    await expect(mirrorAudio('https://tempfile.example/x.mp3', 't1', 'a1')).rejects.toThrow(
      /Failed to fetch audio/,
    );
  });
});
