export const CLIP_SECONDS = 30;
export const OUT_W = 1920;
export const OUT_H = 1080;
export const FPS = 30;

/** Oversample so the pan has somewhere to travel; 1.2x the output width. */
const PAN_W = Math.round(OUT_W * 1.2);
const CRF = '24';

/**
 * scale+crop with `t` expressions, never zoompan: zoompan exceeded 540s of
 * wall clock for ~9 minutes of 1080p30 output.
 */
export function buildClipArgs(imagePath: string, outputPath: string): string[] {
  const vf =
    `scale=${PAN_W}:-2,` +
    `crop=${OUT_W}:${OUT_H}:x='(iw-ow)*t/${CLIP_SECONDS}':y='(ih-oh)*t/${CLIP_SECONDS}',` +
    `format=yuv420p`;

  return [
    '-v', 'error',
    '-loop', '1',
    '-framerate', String(FPS),
    '-t', String(CLIP_SECONDS),
    '-i', imagePath,
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'stillimage',
    '-crf', CRF,
    '-y', outputPath,
  ];
}

/** Forward then reverse, so the last frame equals the first and the loop is continuous. */
export function buildBoomerangArgs(clipPath: string, outputPath: string): string[] {
  return [
    '-v', 'error',
    '-i', clipPath,
    '-filter_complex', '[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[o]',
    '-map', '[o]',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', CRF,
    '-y', outputPath,
  ];
}

/** `-stream_loop N` means N *additional* plays, so N+1 total. */
export function loopsFor(totalSeconds: number, boomerangSeconds: number): number {
  return Math.max(0, Math.ceil(totalSeconds / boomerangSeconds) - 1);
}

export function buildLoopMuxArgs(
  boomerangPath: string,
  audioPath: string,
  loops: number,
  outputPath: string,
): string[] {
  return [
    '-v', 'error',
    '-stream_loop', String(loops),
    '-i', boomerangPath,
    '-i', audioPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-shortest',
    '-y', outputPath,
  ];
}
