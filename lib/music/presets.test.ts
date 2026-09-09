import { describe, expect, it } from 'vitest';
import { GENRE_PRESETS, getPreset } from './presets';

describe('genre presets', () => {
  it('has unique ids', () => {
    const ids = GENRE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names the bpm in the prompt, because /generate has no tempo field', () => {
    for (const preset of GENRE_PRESETS) {
      expect(preset.prompt).toContain(`${preset.tempo} bpm`);
    }
  });

  it('keeps every prompt inside the 500-character limit of the sounds endpoint', () => {
    for (const preset of GENRE_PRESETS) {
      expect(preset.prompt.length).toBeLessThanOrEqual(500);
    }
  });

  it('marks every preset instrumental, since the pipeline never uses vocals', () => {
    for (const preset of GENRE_PRESETS) {
      expect(preset.prompt).toContain('instrumental');
    }
  });

  it('uses keys the sounds endpoint accepts', () => {
    const allowed = new Set([
      'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm',
      'C','C#','D','D#','E','F','F#','G','G#','A','A#','B',
    ]);
    for (const preset of GENRE_PRESETS) {
      if (preset.musicalKey) expect(allowed.has(preset.musicalKey)).toBe(true);
    }
  });

  it('returns undefined for an unknown id', () => {
    expect(getPreset('nope')).toBeUndefined();
  });
});
