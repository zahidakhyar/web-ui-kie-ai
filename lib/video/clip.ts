/** Full length of one loop unit. The pan travels out and back inside this. */
export const LOOP_SECONDS = 60;
export const OUT_W = 1920;
export const OUT_H = 1080;
export const FPS = 30;

/** Oversample so the pan has somewhere to travel; 1.2x the output width. */
const PAN_W = Math.round(OUT_W * 1.2);
const CRF = '24';

/**
 * A triangle wave, p(t) = 1 - |1 - 2t/LOOP_SECONDS|, moves the crop 0 -> 1 -> 0
 * across the clip, so the last frame matches the first and the clip loops with
 * no seam.
 *
 * This replaces rendering a one-way pan and then reversing it. The `reverse`
 * filter buffers every decoded frame: measured 1.19 GB peak for 30s of 1080p,
 * which will OOM a small container. One pass measured 418 MB and produces a
 * smaller file.
 *
 * Never zoompan: it exceeded 540s of wall clock for ~9 minutes of 1080p30.
 */
export function buildClipArgs(imagePath: string, outputPath: string): string[] {
  const half = LOOP_SECONDS / 2;
  const pan = `(1-abs(1-t/${half}))`;
  const vf =
    `scale=${PAN_W}:-2,` +
    `crop=${OUT_W}:${OUT_H}:x='(iw-ow)*${pan}':y='(ih-oh)*${pan}',` +
    `format=yuv420p`;

  return [
    '-v', 'error',
    '-loop', '1',
    '-framerate', String(FPS),
    '-t', String(LOOP_SECONDS),
    '-i', imagePath,
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'stillimage',
    '-crf', CRF,
    '-y', outputPath,
  ];
}

/** `-stream_loop N` means N *additional* plays, so N+1 total. */
export function loopsFor(totalSeconds: number, clipSeconds: number): number {
  return Math.max(0, Math.ceil(totalSeconds / clipSeconds) - 1);
}

export function buildLoopMuxArgs(
  clipPath: string,
  audioPath: string,
  loops: number,
  outputPath: string,
): string[] {
  return [
    '-v', 'error',
    '-stream_loop', String(loops),
    '-i', clipPath,
    '-i', audioPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-shortest',
    '-y', outputPath,
  ];
}
