import { describe, expect, it } from 'vitest';
import { SUNO_LIMITS, styleLimit } from './limits';

describe('styleLimit', () => {
  it('caps at 500 on the loop endpoint, which has a single 500-character prompt', () => {
    expect(styleLimit(true)).toBe(500);
  });

  it('allows 1000 on the full-track endpoint, where style is its own field', () => {
    expect(styleLimit(false)).toBe(1000);
  });

  it('never lets the loop cap exceed the full-track cap', () => {
    expect(styleLimit(true)).toBeLessThanOrEqual(styleLimit(false));
  });
});

describe('SUNO_LIMITS', () => {
  it('gives lyrics far more room than style, since lyrics are sung verbatim', () => {
    expect(SUNO_LIMITS.generateLyrics).toBeGreaterThan(SUNO_LIMITS.generateStyle);
  });

  it('keeps the title short enough for a filename', () => {
    expect(SUNO_LIMITS.title).toBe(80);
  });
});
