import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  generateSounds: vi.fn(),
  generateMusic: vi.fn(),
}));

import { generateMusic, generateSounds } from './client';
import { getAudioSource } from './audio-source';

beforeEach(() => vi.clearAllMocks());

describe('sounds source', () => {
  it('always requests a loop and forwards tempo and key', async () => {
    const spy = vi.mocked(generateSounds).mockResolvedValue('task-1');

    const taskId = await getAudioSource('sounds').start({
      prompt: 'lofi hip hop',
      instrumental: true,
      tempo: 75,
      musicalKey: 'Am',
    });

    expect(taskId).toBe('task-1');
    expect(spy).toHaveBeenCalledWith({
      prompt: 'lofi hip hop',
      model: 'V5',
      soundLoop: true,
      soundTempo: 75,
      soundKey: 'Am',
    });
  });

  it('omits tempo and key when not supplied', async () => {
    const spy = vi.mocked(generateSounds).mockResolvedValue('task-2');

    await getAudioSource('sounds').start({ prompt: 'ambient', instrumental: true });

    expect(spy).toHaveBeenCalledWith({ prompt: 'ambient', model: 'V5', soundLoop: true });
  });
});

describe('generate source', () => {
  it('uses custom mode with style and title, and clamps duration to the documented range', async () => {
    const spy = vi.mocked(generateMusic).mockResolvedValue('task-3');

    await getAudioSource('generate').start({
      prompt: 'lofi hip hop, rainy night',
      instrumental: true,
      targetSeconds: 900,
    });

    expect(spy).toHaveBeenCalledWith({
      prompt: 'lofi hip hop, rainy night',
      model: 'V5_5',
      customMode: true,
      instrumental: true,
      style: 'lofi hip hop, rainy night',
      title: 'lofi hip hop, rainy night',
      duration: 360,
    });
  });

  it('truncates a long prompt to the 80-char title limit', async () => {
    const spy = vi.mocked(generateMusic).mockResolvedValue('task-4');
    const longPrompt = 'a'.repeat(200);

    await getAudioSource('generate').start({ prompt: longPrompt, instrumental: true });

    const arg = spy.mock.calls[0][0];
    expect(arg.title!.length).toBeLessThanOrEqual(80);
  });
});

describe('getAudioSource', () => {
  it('throws on an unknown id', () => {
    expect(() => getAudioSource('nope')).toThrow(/Unknown audio source/);
  });

  it('rejects prototype-chain keys that `in` would wrongly accept', () => {
    expect(() => getAudioSource('__proto__')).toThrow(/Unknown audio source/);
    expect(() => getAudioSource('constructor')).toThrow(/Unknown audio source/);
  });
});

describe('vocal mode', () => {
  it('sends the lyrics as prompt and the style separately, because Suno sings prompt verbatim', async () => {
    const spy = vi.mocked(generateMusic).mockResolvedValue('task-5');

    await getAudioSource('generate').start({
      prompt: 'dark trap, heavy 808',
      instrumental: false,
      lyrics: 'first line\nsecond line',
      vocalGender: 'f',
    });

    const arg = spy.mock.calls[0][0];
    expect(arg.prompt).toBe('first line\nsecond line');
    expect(arg.style).toBe('dark trap, heavy 808');
    expect(arg.instrumental).toBe(false);
    expect(arg.vocalGender).toBe('f');
  });

  it('omits vocalGender when none is chosen', async () => {
    const spy = vi.mocked(generateMusic).mockResolvedValue('task-6');

    await getAudioSource('generate').start({
      prompt: 'dark trap',
      instrumental: false,
      lyrics: 'words',
    });

    expect(spy.mock.calls[0][0]).not.toHaveProperty('vocalGender');
  });

  it('refuses vocal mode without lyrics', async () => {
    await expect(
      getAudioSource('generate').start({ prompt: 'dark trap', instrumental: false }),
    ).rejects.toThrow(/Lyrics are required/);
  });

  it('refuses vocal mode on the loop endpoint, which has no vocal fields at all', async () => {
    await expect(
      getAudioSource('sounds').start({
        prompt: 'dark trap',
        instrumental: false,
        lyrics: 'words',
      }),
    ).rejects.toThrow(/cannot generate vocals/);
  });

  it('still sends the style as prompt when instrumental', async () => {
    const spy = vi.mocked(generateMusic).mockResolvedValue('task-7');

    await getAudioSource('generate').start({ prompt: 'lofi piano', instrumental: true });

    const arg = spy.mock.calls[0][0];
    expect(arg.prompt).toBe('lofi piano');
    expect(arg.style).toBe('lofi piano');
  });
});

