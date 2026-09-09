import { afterEach, describe, expect, it, vi } from 'vitest';
import { SunoError, generateSounds, getMusicRecord } from './client';

function mockFetchOnce(body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

describe('generateSounds', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the taskId on success', async () => {
    mockFetchOnce({ code: 200, msg: 'success', data: { taskId: 'abc123' } });
    process.env.KIE_API_KEY = 'test-key';

    const taskId = await generateSounds({ prompt: 'lofi', model: 'V5', soundLoop: true });

    expect(taskId).toBe('abc123');
  });

  it('throws SunoError when the body code is not 200 even though HTTP is 200', async () => {
    mockFetchOnce({ code: 422, msg: 'Please enter callBackUrl.', data: null });
    process.env.KIE_API_KEY = 'test-key';

    await expect(generateSounds({ prompt: 'lofi', model: 'V5' })).rejects.toThrow(SunoError);
  });

  it('throws when KIE_API_KEY is missing', async () => {
    delete process.env.KIE_API_KEY;
    await expect(generateSounds({ prompt: 'lofi', model: 'V5' })).rejects.toThrow(/KIE_API_KEY/);
  });
});

describe('getMusicRecord', () => {
  afterEach(() => vi.restoreAllMocks());

  it('surfaces a failed generation as a record, not a throw', async () => {
    mockFetchOnce({
      code: 200,
      msg: 'success',
      data: {
        taskId: 'abc123',
        status: 'GENERATE_AUDIO_FAILED',
        errorCode: 500,
        errorMessage: 'Internal Error, Please try again later.',
        response: { sunoData: null },
      },
    });
    process.env.KIE_API_KEY = 'test-key';

    const record = await getMusicRecord('abc123');

    expect(record.status).toBe('GENERATE_AUDIO_FAILED');
    expect(record.errorMessage).toBe('Internal Error, Please try again later.');
  });
});
