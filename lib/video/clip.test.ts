import { describe, expect, it } from 'vitest';
import { LOOP_SECONDS, buildClipArgs, buildLoopMuxArgs, loopsFor } from './clip';

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

  it('renders exactly LOOP_SECONDS of video', () => {
    const args = buildClipArgs('/tmp/bg.jpg', '/tmp/clip.mp4');
    expect(args[args.indexOf('-t') + 1]).toBe(String(LOOP_SECONDS));
  });

  it('pans out and back so the clip loops without a reverse pass', () => {
    const vf = buildClipArgs('/tmp/bg.jpg', '/tmp/clip.mp4')[
      buildClipArgs('/tmp/bg.jpg', '/tmp/clip.mp4').indexOf('-vf') + 1
    ];
    // Triangle wave: 1 - |1 - t/half|, which is 0 at t=0 and again at t=LOOP_SECONDS.
    expect(vf).toContain(`1-abs(1-t/${LOOP_SECONDS / 2})`);
  });

  it('never reverses, which would buffer every frame', () => {
    const args = buildClipArgs('/tmp/bg.jpg', '/tmp/clip.mp4');
    expect(args.join(' ')).not.toContain('reverse');
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
