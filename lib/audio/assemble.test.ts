import { describe, expect, it, vi } from 'vitest';

vi.mock('./ffmpeg', () => ({ buildMixArgs: vi.fn(() => []), runFfmpeg: vi.fn() }));

import { mixKey } from './assemble';

describe('mixKey', () => {
  it('namespaces mixes under their own prefix with a date folder', () => {
    expect(mixKey('m1')).toMatch(/^mixes\/\d{4}-\d{2}-\d{2}\/m1\.mp3$/);
  });
});
