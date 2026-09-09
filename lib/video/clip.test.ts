import { describe, expect, it } from 'vitest';
import {
  CLIP_SECONDS,
  buildBoomerangArgs,
  buildClipArgs,
  buildLoopMuxArgs,
  loopsFor,
} from './clip';

describe('buildClipArgs', () => {
  it('pans with scale+crop and never uses zoompan', () => {
    const args = buildClipArgs('/tmp/bg.jpg', '/tmp/clip.mp4');
    const vf = args[args.indexOf('-vf') + 1];
    expect(vf).toContain('scale=');
    expect(vf).toContain('crop=1920:1080');
    expect(vf).not.toContain('zoompan');
    expect(args).toContain('/tmp/bg.jpg');
    expect(args.at(-1)).toBe('/tmp/clip.mp4');
  });

  it('renders exactly CLIP_SECONDS of video', () => {
    const args = buildClipArgs('/tmp/bg.jpg', '/tmp/clip.mp4');
    expect(args[args.indexOf('-t') + 1]).toBe(String(CLIP_SECONDS));
  });
});

describe('buildBoomerangArgs', () => {
  it('concatenates the clip with its reverse', () => {
    const args = buildBoomerangArgs('/tmp/clip.mp4', '/tmp/boom.mp4');
    const graph = args[args.indexOf('-filter_complex') + 1];
    expect(graph).toContain('reverse');
    expect(graph).toContain('concat=n=2');
  });
});

describe('buildLoopMuxArgs', () => {
  it('stream-copies both tracks so no filter runs over the full length', () => {
    const args = buildLoopMuxArgs('/tmp/boom.mp4', '/tmp/mix.mp3', 59, '/tmp/out.mp4');
    expect(args[args.indexOf('-stream_loop') + 1]).toBe('59');
    expect(args[args.indexOf('-c:v') + 1]).toBe('copy');
    expect(args[args.indexOf('-c:a') + 1]).toBe('copy');
    expect(args).toContain('-shortest');
    expect(args).not.toContain('-filter_complex');
  });
});

describe('loopsFor', () => {
  it('covers an hour with 60s boomerangs', () => {
    // -stream_loop N means N *extra* plays, so 60 total plays is 59.
    expect(loopsFor(3600, 60)).toBe(59);
  });

  it('never returns a negative loop count for short targets', () => {
    expect(loopsFor(10, 60)).toBe(0);
  });

  it('rounds up so the video is never shorter than the audio', () => {
    expect(loopsFor(130, 60)).toBe(2);
  });
});
