import { describe, expect, it } from 'vitest';
import { CLIP_CRF, buildLoopArgs, crossfadeFor, loopSecondsFor } from './loop';

const vf = (args: string[]) => args[args.indexOf('-filter_complex') + 1];

describe('crossfadeFor', () => {
  it('gives a full second to an 8s veo3_lite clip', () => {
    expect(crossfadeFor(8)).toBe(1);
  });

  it('shrinks on short clips so the xfade offset stays positive', () => {
    // offset is D - 2X, so X must never exceed D/2.
    expect(crossfadeFor(2)).toBeLessThan(1);
    expect(2 - 2 * crossfadeFor(2)).toBeGreaterThan(0);
  });
});

describe('loopSecondsFor', () => {
  it('is shorter than the source by one crossfade', () => {
    expect(loopSecondsFor(8)).toBe(7);
  });
});

describe('buildLoopArgs', () => {
  it('crossfades the tail onto the head at D-2X so the loop has no seam', () => {
    const args = buildLoopArgs('/tmp/veo.mp4', '/tmp/loop.mp4', 8);
    expect(vf(args)).toContain('xfade=transition=fade:duration=1:offset=6');
  });

  it('drops the audio track that veo always returns', () => {
    expect(buildLoopArgs('/tmp/veo.mp4', '/tmp/loop.mp4', 8)).toContain('-an');
  });

  it('normalizes to 1920x1080 so the mux output matches its label', () => {
    expect(vf(buildLoopArgs('/tmp/veo.mp4', '/tmp/loop.mp4', 8))).toContain('1920:1080');
  });

  it('leaves the source frame rate alone, since resampling 24 to 30 duplicates frames', () => {
    expect(buildLoopArgs('/tmp/veo.mp4', '/tmp/loop.mp4', 8).join(' ')).not.toContain('fps=');
  });

  it('never reverses, which would buffer every frame', () => {
    expect(buildLoopArgs('/tmp/veo.mp4', '/tmp/loop.mp4', 8).join(' ')).not.toContain('reverse');
  });

  it('encodes at the CRF measured to keep an hour under a gigabyte', () => {
    const args = buildLoopArgs('/tmp/veo.mp4', '/tmp/loop.mp4', 8);
    expect(args[args.indexOf('-crf') + 1]).toBe(CLIP_CRF);
    expect(args.at(-1)).toBe('/tmp/loop.mp4');
  });
});
