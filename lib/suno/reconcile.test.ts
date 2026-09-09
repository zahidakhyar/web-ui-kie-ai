import { describe, expect, it } from 'vitest';
import { reconcile } from './reconcile';
import type { SunoRecord } from './types';

function record(over: Partial<SunoRecord>): SunoRecord {
  return {
    taskId: 't1',
    status: 'PENDING',
    errorCode: null,
    errorMessage: null,
    response: null,
    ...over,
  };
}

describe('reconcile', () => {
  it('treats PENDING and TEXT_SUCCESS as still running', () => {
    expect(reconcile(record({ status: 'PENDING' })).kind).toBe('pending');
    expect(reconcile(record({ status: 'TEXT_SUCCESS' })).kind).toBe('pending');
  });

  it('returns the tracks on SUCCESS', () => {
    const outcome = reconcile(
      record({
        status: 'SUCCESS',
        response: {
          sunoData: [
            {
              id: 'a1',
              title: 'Lofi',
              duration: 20.76,
              audioUrl: 'https://suno/a1.mp3',
              imageUrl: 'https://suno/a1.jpeg',
              modelName: 'chirp-crow',
            },
          ],
        },
      }),
    );

    expect(outcome).toEqual({
      kind: 'succeeded',
      tracks: [
        {
          id: 'a1',
          title: 'Lofi',
          duration: 20.76,
          audioUrl: 'https://suno/a1.mp3',
          imageUrl: 'https://suno/a1.jpeg',
          modelName: 'chirp-crow',
        },
      ],
    });
  });

  it('carries the upstream error message through on GENERATE_AUDIO_FAILED', () => {
    const outcome = reconcile(
      record({
        status: 'GENERATE_AUDIO_FAILED',
        errorCode: 500,
        errorMessage: 'Internal Error, Please try again later.',
      }),
    );

    expect(outcome).toEqual({
      kind: 'failed',
      errorMsg: 'Internal Error, Please try again later.',
    });
  });

  it('fails with a fallback message when the upstream gives none', () => {
    const outcome = reconcile(record({ status: 'CREATE_TASK_FAILED' }));
    expect(outcome).toEqual({ kind: 'failed', errorMsg: 'CREATE_TASK_FAILED' });
  });

  it('fails rather than succeeding empty when SUCCESS carries no tracks', () => {
    const outcome = reconcile(record({ status: 'SUCCESS', response: { sunoData: [] } }));
    expect(outcome.kind).toBe('failed');
  });
});
