import { generateMusic, generateSounds } from './client';

export type AudioSourceId = 'sounds' | 'generate';

export interface AudioSourceRequest {
  /** The style description. In vocal mode this stays the style; `lyrics` carries the words. */
  prompt: string;
  instrumental: boolean;
  /** Required when instrumental is false. Suno sings it verbatim. */
  lyrics?: string;
  vocalGender?: 'm' | 'f';
  tempo?: number;
  musicalKey?: string;
  /** Desired seconds for one unit. Only `generate` honours it, and only up to 360. */
  targetSeconds?: number;
}

export interface AudioSource {
  id: AudioSourceId;
  label: string;
  start(req: AudioSourceRequest): Promise<string>;
}

/** V5_5's `duration` param is documented as 10-360s. */
const MIN_DURATION = 10;
const MAX_DURATION = 360;
const TITLE_MAX = 80;

const soundsSource: AudioSource = {
  id: 'sounds',
  label: 'Sounds loop (~21s, proven)',
  start: async ({ prompt, instrumental, tempo, musicalKey }) => {
    // The sounds endpoint has no instrumental or vocalGender field at all, so
    // vocals are impossible on this path rather than merely unsupported.
    if (!instrumental) {
      throw new Error('The 21-second loop endpoint cannot generate vocals.');
    }
    return generateSounds({
      prompt,
      model: 'V5',
      soundLoop: true,
      ...(tempo !== undefined ? { soundTempo: tempo } : {}),
      ...(musicalKey !== undefined ? { soundKey: musicalKey } : {}),
    });
  },
};

const generateSource: AudioSource = {
  id: 'generate',
  label: 'Full track (longer, currently unreliable)',
  start: async ({ prompt, instrumental, lyrics, vocalGender, targetSeconds }) => {
    if (!instrumental && !lyrics?.trim()) {
      throw new Error('Lyrics are required when the track is not instrumental.');
    }
    const title = prompt.slice(0, TITLE_MAX);
    return generateMusic({
      // In custom mode Suno sings `prompt` verbatim, so the lyrics go there and
      // the style description moves to `style`.
      prompt: instrumental ? prompt : lyrics!.trim(),
      model: 'V5_5',
      customMode: true,
      instrumental,
      style: prompt,
      title,
      ...(vocalGender ? { vocalGender } : {}),
      ...(targetSeconds !== undefined
        ? { duration: Math.min(MAX_DURATION, Math.max(MIN_DURATION, targetSeconds)) }
        : {}),
    });
  },
};

export const AUDIO_SOURCES: Record<AudioSourceId, AudioSource> = {
  sounds: soundsSource,
  generate: generateSource,
};

/**
 * Narrows an untrusted string. `Object.hasOwn` rather than `in`, so request
 * bodies carrying `__proto__` or `constructor` are rejected.
 */
export function isAudioSourceId(id: string): id is AudioSourceId {
  return Object.hasOwn(AUDIO_SOURCES, id);
}

export function getAudioSource(id: string): AudioSource {
  if (!isAudioSourceId(id)) throw new Error(`Unknown audio source: ${id}`);
  return AUDIO_SOURCES[id];
}
