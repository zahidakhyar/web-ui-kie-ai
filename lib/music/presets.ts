export interface GenrePreset {
  id: string;
  label: string;
  /** Used as both the prompt and, on /generate, the style tag. */
  prompt: string;
  /** Only the sounds endpoint accepts a tempo field; /generate reads BPM from the prompt text. */
  tempo: number;
  /** Only the sounds endpoint accepts a key. */
  musicalKey?: string;
}

/**
 * Starting points, not a fixed menu: picking one fills the prompt so it can be
 * edited. Measured on 2026-09-09, the style prompt dominates generation far
 * more than any other parameter, so this is the highest-leverage control here.
 *
 * Each prompt names its BPM because /generate has no tempo field and reads it
 * from the text; the numeric `tempo` only reaches the loop endpoint.
 */
export const GENRE_PRESETS: GenrePreset[] = [
  {
    id: 'lofi-study',
    label: 'Lofi study',
    prompt:
      'lofi hip hop at 75 bpm, warm vinyl crackle, mellow rhodes piano, soft boom-bap drums, rain on the window, calm and nocturnal, instrumental',
    tempo: 75,
    musicalKey: 'Am',
  },
  {
    id: 'trap-gym',
    label: 'Trap gym',
    prompt:
      'hard trap at 140 bpm, booming 808 bass, fast hi-hat rolls, dark brass stabs, aggressive and driving, gym workout energy, instrumental',
    tempo: 140,
    musicalKey: 'Fm',
  },
  {
    id: 'phonk-gym',
    label: 'Phonk gym',
    prompt:
      'drift phonk at 130 bpm, distorted cowbell melody, heavy sidechained bass, memphis vocal chops, menacing and hypnotic, instrumental',
    tempo: 130,
    musicalKey: 'Gm',
  },
  {
    id: 'ambient-focus',
    label: 'Ambient focus',
    prompt:
      'ambient focus music at 60 bpm, sustained warm pads, distant piano, tape hiss, no percussion, spacious and still, instrumental',
    tempo: 60,
    musicalKey: 'Dm',
  },
  {
    id: 'jazz-cafe',
    label: 'Jazz cafe',
    prompt:
      'jazz cafe at 95 bpm, brushed drums, upright bass walking, muted trumpet, rhodes comping, relaxed and warm, instrumental',
    tempo: 95,
    musicalKey: 'Cm',
  },
];

export function getPreset(id: string): GenrePreset | undefined {
  return GENRE_PRESETS.find((p) => p.id === id);
}
