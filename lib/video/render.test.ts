import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/audio/ffmpeg', () => ({ runFfmpeg: vi.fn() }));

import { renderKey } from './render';

describe('renderKey', () => {
  it('namespaces renders under their own prefix with a date folder', () => {
    expect(renderKey('r1')).toMatch(/^videos\/\d{4}-\d{2}-\d{2}\/r1\.mp4$/);
  });
});
