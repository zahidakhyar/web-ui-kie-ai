import { describe, expect, it } from 'vitest';
import { CROSSFADE_SECONDS, planMix } from './plan';

describe('planMix', () => {
  it('rotates through the supplied tracks in order', () => {
    const plan = planMix(['a.mp3', 'b.mp3'], [20, 20], 100);
    expect(plan.inputs.slice(0, 4)).toEqual(['a.mp3', 'b.mp3', 'a.mp3', 'b.mp3']);
  });

  it('accounts for crossfade overlap in the total length', () => {
    // 6 inputs x 20s, overlapping 2s at each of the 5 seams = 120 - 10 = 110
    const plan = planMix(['a.mp3'], [20], 110);
    expect(plan.inputs).toHaveLength(6);
    expect(plan.totalSeconds).toBeCloseTo(110, 1);
  });

  it('reaches at least the target length, never short', () => {
    const plan = planMix(['a.mp3'], [20.76], 3600);
    expect(plan.totalSeconds).toBeGreaterThanOrEqual(3600);
  });

  it('needs about 192 inputs for an hour of 20.76s loops', () => {
    const plan = planMix(['a.mp3'], [20.76], 3600);
    expect(plan.inputs.length).toBeGreaterThan(180);
    expect(plan.inputs.length).toBeLessThan(205);
  });

  it('returns a single input when one track already covers the target', () => {
    const plan = planMix(['a.mp3'], [60], 30);
    expect(plan.inputs).toEqual(['a.mp3']);
    expect(plan.totalSeconds).toBeCloseTo(60, 1);
  });

  it('rejects an empty track list', () => {
    expect(() => planMix([], [], 60)).toThrow(/at least one track/);
  });

  it('rejects a track shorter than the crossfade', () => {
    expect(() => planMix(['a.mp3'], [CROSSFADE_SECONDS], 60)).toThrow(/shorter than/);
  });
});
