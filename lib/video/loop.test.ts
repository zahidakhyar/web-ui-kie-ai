import { describe, expect, it } from 'vitest';
import {
  CANONICAL_FPS,
  CLIP_CRF,
  MAX_CLIPS,
  buildLoopArgs,
  buildNormalizeArgs,
  crossfadeFor,
  loopSecondsFor,
} from './loop';

const one = [{ path: '/tmp/a.mp4', seconds: 8 }];
const three = [
  { path: '/tmp/a.mp4', seconds: 8 },
  { path: '/tmp/b.mp4', seconds: 5 },
  { path: '/tmp/c.mp4', seconds: 8 },
];
const vf = (args: string[]) => args[args.indexOf('-filter_complex') + 1];

describe('crossfadeFor', () => {
  it('gives a full second to 8s veo3_lite clips', () => {
    expect(crossfadeFor(one)).toBe(1);
  });

  it('is bounded by the shortest clip, not the longest', () => {
    const mixed = [{ path: 'a', seconds: 8 }, { path: 'b', seconds: 2 }];
    expect(crossfadeFor(mixed)).toBeLessThan(1);
    expect(2 - 2 * crossfadeFor(mixed)).toBeGreaterThan(0);
  });
});

describe('loopSecondsFor', () => {
  it('loses one crossfade per clip, including the wrap back to the first', () => {
    expect(loopSecondsFor(one)).toBe(7);
    expect(loopSecondsFor(three)).toBe(18);
  });
});

describe('buildLoopArgs', () => {
  it('reproduces the single-clip loop it replaced', () => {
    expect(vf(buildLoopArgs(one, '/tmp/out.mp4'))).toContain(
      'xfade=transition=fade:duration=1:offset=6',
    );
  });

  it('starts the chain one crossfade into the first clip', () => {
    // The wrap ends on the first clip's head, so the body has to begin where
    // that head stops or the loop jumps by a full crossfade.
    expect(vf(buildLoopArgs(three, '/tmp/out.mp4'))).toContain(
      'trim=start=1,setpts=PTS-STARTPTS[c0]',
    );
  });

  it('closes the loop against the first clip, never the last', () => {
    const filter = vf(buildLoopArgs(three, '/tmp/out.mp4'));
    expect(filter).toContain('[0:v]split');
    expect(filter).toContain('trim=duration=1,setpts=PTS-STARTPTS[h]');
    expect(filter).toMatch(/\[h\]xfade[^;]*\[v\]$/);
  });

  it('places each xfade one crossfade before the running end', () => {
    const filter = vf(buildLoopArgs(three, '/tmp/out.mp4'));
    // Bodies run 7, 5, 8; the chain ends at 7, then 11, then 18.
    expect(filter).toContain('[c0][c1]xfade=transition=fade:duration=1:offset=6');
    expect(filter).toContain('[x1][c2]xfade=transition=fade:duration=1:offset=10');
    expect(filter).toContain('[x2][h]xfade=transition=fade:duration=1:offset=17');
  });

  it('lists every clip as its own input', () => {
    const args = buildLoopArgs(three, '/tmp/out.mp4');
    expect(args.filter((a) => a === '-i')).toHaveLength(3);
    expect(args).toContain('/tmp/c.mp4');
  });

  it('drops the audio track that veo always returns', () => {
    expect(buildLoopArgs(one, '/tmp/out.mp4')).toContain('-an');
  });

  it('never reverses, which would buffer every frame', () => {
    expect(buildLoopArgs(three, '/tmp/out.mp4').join(' ')).not.toContain('reverse');
  });

  it('encodes at the CRF measured to keep an hour under a gigabyte', () => {
    const args = buildLoopArgs(one, '/tmp/out.mp4');
    expect(args[args.indexOf('-crf') + 1]).toBe(CLIP_CRF);
    expect(args.at(-1)).toBe('/tmp/out.mp4');
  });

  it('refuses an empty clip list rather than emitting a broken filtergraph', () => {
    expect(() => buildLoopArgs([], '/tmp/out.mp4')).toThrow(/at least one/i);
  });

  it('caps the chain where memory was measured to stay safe', () => {
    expect(MAX_CLIPS).toBe(4);
  });
});

describe('buildNormalizeArgs', () => {
  it('pins every clip to one frame rate, because xfade rejects a mismatch', () => {
    const args = buildNormalizeArgs('/tmp/veo.mp4', '/tmp/norm.mp4');
    expect(args[args.indexOf('-vf') + 1]).toContain(`fps=${CANONICAL_FPS}`);
  });

  it('pads to 1920x1080 rather than stretching an odd aspect ratio', () => {
    const vfArg = buildNormalizeArgs('/tmp/veo.mp4', '/tmp/norm.mp4');
    const filter = vfArg[vfArg.indexOf('-vf') + 1];
    expect(filter).toContain('force_original_aspect_ratio=decrease');
    expect(filter).toContain('pad=1920:1080');
  });

  it('drops audio and keeps the clip CRF', () => {
    const args = buildNormalizeArgs('/tmp/veo.mp4', '/tmp/norm.mp4');
    expect(args).toContain('-an');
    expect(args[args.indexOf('-crf') + 1]).toBe(CLIP_CRF);
    expect(args.at(-1)).toBe('/tmp/norm.mp4');
  });
});
