import { generateMusic, generateSounds } from './client';

export type AudioSourceId = 'sounds' | 'generate';

export interface AudioSourceRequest {
  prompt: string;
  instrumental: boolean;
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
  start: ({ prompt, tempo, musicalKey }) =>
    generateSounds({
      prompt,
      model: 'V5',
      soundLoop: true,
      ...(tempo !== undefined ? { soundTempo: tempo } : {}),
      ...(musicalKey !== undefined ? { soundKey: musicalKey } : {}),
    }),
};

const generateSource: AudioSource = {
  id: 'generate',
  label: 'Full track (longer, currently unreliable)',
  start: ({ prompt, instrumental, targetSeconds }) => {
    const title = prompt.slice(0, TITLE_MAX);
    return generateMusic({
      prompt,
      model: 'V5_5',
      customMode: true,
      instrumental,
      style: prompt,
      title,
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
