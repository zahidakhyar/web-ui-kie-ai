/**
 * Character limits differ per endpoint and per field, so a single hardcoded cap
 * is wrong somewhere. Values are from the kie.ai docs for the models this app
 * actually sends: V5_5 on /generate, V5 on /generate/sounds.
 */
export const SUNO_LIMITS = {
  /** /generate/sounds documents one 500-character prompt and no style field. */
  soundsPrompt: 500,
  /** /generate `style` on V5_5 and V5. V4 would be 200, which this app never sends. */
  generateStyle: 1000,
  /** /generate `prompt`, which is the sung lyrics in vocal mode, on V5_5 and V5. */
  generateLyrics: 5000,
  /** /generate `title` on every model. */
  title: 80,
} as const;

/** The style box feeds a different field depending on which endpoint runs. */
export function styleLimit(isLoop: boolean): number {
  return isLoop ? SUNO_LIMITS.soundsPrompt : SUNO_LIMITS.generateStyle;
}
