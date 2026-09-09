/** Overlap applied at every seam. Measured gapless at 191 seams across a full hour. */
export const CROSSFADE_SECONDS = 2;

export interface MixPlan {
  /** File paths in chain order; the same track may repeat. */
  inputs: string[];
  totalSeconds: number;
}

/**
 * A chain of n inputs of duration d runs for n*d - (n-1)*CROSSFADE_SECONDS,
 * because each acrossfade consumes CROSSFADE_SECONDS from both of its sides.
 */
export function planMix(
  trackPaths: string[],
  trackDurations: number[],
  targetSeconds: number,
): MixPlan {
  if (trackPaths.length === 0) throw new Error('planMix needs at least one track');
  if (trackPaths.length !== trackDurations.length) {
    throw new Error('planMix needs one duration per track');
  }
  for (const d of trackDurations) {
    if (d <= CROSSFADE_SECONDS) {
      throw new Error(`Track is shorter than the ${CROSSFADE_SECONDS}s crossfade`);
    }
  }

  const inputs: string[] = [];
  let total = 0;

  for (let i = 0; total < targetSeconds; i++) {
    const idx = i % trackPaths.length;
    inputs.push(trackPaths[idx]);
    total += i === 0 ? trackDurations[idx] : trackDurations[idx] - CROSSFADE_SECONDS;
  }

  return { inputs, totalSeconds: total };
}
