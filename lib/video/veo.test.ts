import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VEO_MODEL,
  buildVeoRequest,
  createVeoTask,
  readVeoRecord,
  requestVeo1080p,
} from './veo';

function mockFetchOnce(body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

describe('buildVeoRequest', () => {
  it('asks the lite model for a 16:9 text-to-video clip', () => {
    const body = buildVeoRequest('drifting neon clouds', 'https://example.com/cb');
    expect(body.model).toBe(VEO_MODEL);
    expect(body.generationType).toBe('TEXT_2_VIDEO');
    expect(body.aspect_ratio).toBe('16:9');
    expect(body.prompt).toBe('drifting neon clouds');
  });
});

describe('readVeoRecord', () => {
  it('reports pending while successFlag is still 0', () => {
    expect(readVeoRecord({ successFlag: 0 })).toEqual({ kind: 'pending' });
  });

  it('returns the first result url once successFlag turns 1', () => {
    expect(
      readVeoRecord({ successFlag: 1, response: { resultUrls: ['https://cdn/a.mp4'] } }),
    ).toEqual({ kind: 'ready', url: 'https://cdn/a.mp4' });
  });

  it('fails on successFlag 2 and carries the upstream message', () => {
    expect(readVeoRecord({ successFlag: 2, errorMessage: 'blocked' })).toEqual({
      kind: 'failed',
      errorMsg: 'blocked',
    });
  });

  it('fails on successFlag 3, the upstream generation failure', () => {
    expect(readVeoRecord({ successFlag: 3, errorMessage: '' }).kind).toBe('failed');
  });

  it('fails rather than polling forever when a success carries no url', () => {
    expect(readVeoRecord({ successFlag: 1, response: { resultUrls: [] } }).kind).toBe('failed');
  });
});

describe('createVeoTask', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the taskId on success', async () => {
    mockFetchOnce({ code: 200, msg: 'success', data: { taskId: 'veo-1' } });
    process.env.KIE_API_KEY = 'test-key';

    await expect(createVeoTask('clouds')).resolves.toBe('veo-1');
  });

  it('throws when the body code is not 200 even though HTTP is 200', async () => {
    mockFetchOnce({ code: 402, msg: 'Insufficient Credits', data: null });
    process.env.KIE_API_KEY = 'test-key';

    await expect(createVeoTask('clouds')).rejects.toThrow('Insufficient Credits');
  });
});

describe('requestVeo1080p', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the new upgrade taskId, not the one it was given', async () => {
    mockFetchOnce({ code: 200, msg: 'success', data: { taskId: 'upgrade-9' } });
    process.env.KIE_API_KEY = 'test-key';

    await expect(requestVeo1080p('veo-1')).resolves.toBe('upgrade-9');
  });
});
