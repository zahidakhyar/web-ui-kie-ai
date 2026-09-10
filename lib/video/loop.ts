/** Measured: an hour of AI motion is 1.24 GB at CRF 24 and 0.73 GB at 28. */
export const CLIP_CRF = '28';

/**
 * Every clip in a chain is decoded in parallel, and peak memory climbs with it:
 * measured 646 MB at one clip, 876 at two, 1057 at three, 1099 at four and
 * 1209 at five, on a machine that runs about 1.4x the container. Four is the
 * last step that stays level with a render that has already succeeded there.
 */
export const MAX_CLIPS = 4;

export const CANONICAL_FPS = 24;
const OUT_W = 1920;
const OUT_H = 1080;
const MAX_CROSSFADE_SECONDS = 1;

export interface LoopInput {
  path: string;
  seconds: number;
}

/** Each xfade sits at length-X, so X can never exceed a quarter of any clip. */
export function crossfadeFor(inputs: LoopInput[]): number {
  const shortest = Math.min(...inputs.map((input) => input.seconds));
  return Math.min(MAX_CROSSFADE_SECONDS, shortest / 4);
}

/** One crossfade is spent per clip: N-1 between them, plus the wrap. */
export function loopSecondsFor(inputs: LoopInput[]): number {
  const total = inputs.reduce((sum, input) => sum + input.seconds, 0);
  return total - inputs.length * crossfadeFor(inputs);
}

/**
 * Chains clips into one video that loops with no visible seam, by crossfading
 * each clip onto the previous one and then the last onto the head of the first.
 *
 * The chain has to *begin* one crossfade into the first clip, because that is
 * where the wrap ends. Starting at zero instead leaves a full crossfade of
 * jump at the loop point: measured 17.1 dB against a 29.9 dB control of two
 * adjacent frames, versus 28.5 dB when it starts in the right place.
 *
 * A single clip is the same construction with no links in between, and yields
 * exactly what the earlier one-clip-only version did.
 *
 * Never boomerang with `reverse`; it buffers every decoded frame.
 */
export function buildLoopArgs(inputs: LoopInput[], outputPath: string): string[] {
  if (inputs.length === 0) throw new Error('buildLoopArgs needs at least one clip');

  const fade = crossfadeFor(inputs);
  const parts = [
    '[0:v]split[s0][s1];',
    `[s0]trim=start=${fade},setpts=PTS-STARTPTS[c0];`,
    `[s1]trim=duration=${fade},setpts=PTS-STARTPTS[h];`,
  ];
  for (let i = 1; i < inputs.length; i++) parts.push(`[${i}:v]null[c${i}];`);

  let length = inputs[0].seconds - fade;
  let prev = 'c0';
  for (let i = 1; i < inputs.length; i++) {
    parts.push(
      `[${prev}][c${i}]xfade=transition=fade:duration=${fade}:offset=${length - fade}[x${i}];`,
    );
    length += inputs[i].seconds - fade;
    prev = `x${i}`;
  }
  parts.push(`[${prev}][h]xfade=transition=fade:duration=${fade}:offset=${length - fade}[v]`);

  return [
    '-v', 'error',
    ...inputs.flatMap((input) => ['-i', input.path]),
    '-filter_complex', parts.join(''),
    '-map', '[v]',
    // veo always returns an audio track; the mix supplies the audio instead.
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', CLIP_CRF,
    '-y', outputPath,
  ];
}

/**
 * Clips are stored in one shape so a chain can crossfade between them without
 * any scaling or frame-rate work: xfade rejects mismatched inputs outright.
 */
export function buildNormalizeArgs(inputPath: string, outputPath: string): string[] {
  return [
    '-v', 'error',
    '-i', inputPath,
    '-vf',
    `fps=${CANONICAL_FPS},` +
      `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,` +
      `pad=${OUT_W}:${OUT_H}:-1:-1,setsar=1,format=yuv420p`,
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', CLIP_CRF,
    '-y', outputPath,
  ];
}
