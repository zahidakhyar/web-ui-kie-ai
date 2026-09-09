import { describe, expect, it } from 'vitest';
import { buildMixArgs, runFfmpeg } from './ffmpeg';

describe('buildMixArgs', () => {
  it('emits one -i per input and a chain of n-1 acrossfade stages', () => {
    const args = buildMixArgs(
      { inputs: ['a.mp3', 'b.mp3', 'c.mp3'], totalSeconds: 56 },
      '/tmp/out.mp3',
    );
    expect(args.filter((a) => a === '-i')).toHaveLength(3);

    const graph = args[args.indexOf('-filter_complex') + 1];
    expect(graph.split(';')).toHaveLength(2);
    expect(graph).toContain('[0:a][1:a]acrossfade=d=2');
    expect(graph).toContain('[a1][2:a]acrossfade=d=2');
    expect(args[args.indexOf('-map') + 1]).toBe('[a2]');
    expect(args.at(-1)).toBe('/tmp/out.mp3');
  });

  it('skips the filter graph entirely for a single input', () => {
    const args = buildMixArgs({ inputs: ['a.mp3'], totalSeconds: 20 }, '/tmp/out.mp3');
    expect(args).not.toContain('-filter_complex');
    expect(args.filter((a) => a === '-i')).toHaveLength(1);
  });

  it('never builds a shell string, so paths cannot inject', () => {
    const nasty = '/tmp/a; rm -rf ~.mp3';
    const args = buildMixArgs({ inputs: [nasty], totalSeconds: 20 }, '/tmp/out.mp3');
    expect(args).toContain(nasty);
  });

  it('rejects an empty plan', () => {
    expect(() => buildMixArgs({ inputs: [], totalSeconds: 0 }, '/tmp/o.mp3')).toThrow(
      /at least one input/,
    );
  });
});

describe('runFfmpeg', () => {
  it('rejects with ffmpeg stderr when the command fails', async () => {
    await expect(runFfmpeg(['-thisFlagDoesNotExist'])).rejects.toThrow(/ffmpeg/i);
  });
});
