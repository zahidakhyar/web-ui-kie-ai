/** Measured: an hour of AI motion is 1.24 GB at CRF 24 and 0.73 GB at 28. */
export const CLIP_CRF = '28';

const OUT_W = 1920;
const OUT_H = 1080;
const MAX_CROSSFADE_SECONDS = 1;

/** The xfade sits at D-2X, so X can never exceed a quarter of the clip. */
export function crossfadeFor(sourceSeconds: number): number {
  return Math.min(MAX_CROSSFADE_SECONDS, sourceSeconds / 4);
}

export function loopSecondsFor(sourceSeconds: number): number {
  return sourceSeconds - crossfadeFor(sourceSeconds);
}

/**
 * An AI clip's last frame never matches its first, so `-stream_loop` on the raw
 * file pops at every seam. Crossfading the tail back onto the head closes it:
 * measured PSNR of last-vs-first frame went 14.3 -> 28.7 dB, against a 30.7 dB
 * control of two adjacent mid-clip frames. Output runs D-X seconds.
 *
 * Never boomerang with `reverse` instead — it buffers every decoded frame.
 *
 * Frame rate is deliberately left alone. veo3_lite returns 24 fps and forcing
 * 30 would duplicate one frame in four, which reads as judder on slow drifts.
 */
export function buildLoopArgs(
  inputPath: string,
  outputPath: string,
  sourceSeconds: number,
): string[] {
  const fade = crossfadeFor(sourceSeconds);
  const offset = sourceSeconds - 2 * fade;
  const filter =
    '[0:v]split[body][pre];' +
    `[body]trim=start=${fade},setpts=PTS-STARTPTS[jt];` +
    `[pre]trim=duration=${fade},setpts=PTS-STARTPTS[pt];` +
    `[jt][pt]xfade=transition=fade:duration=${fade}:offset=${offset},` +
    `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,` +
    `pad=${OUT_W}:${OUT_H}:-1:-1,format=yuv420p[v]`;

  return [
    '-v', 'error',
    '-i', inputPath,
    '-filter_complex', filter,
    '-map', '[v]',
    // veo always returns an audio track; the mix supplies the audio instead.
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', CLIP_CRF,
    '-y', outputPath,
  ];
}
