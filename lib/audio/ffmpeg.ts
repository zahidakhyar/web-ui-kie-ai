import { spawn } from 'node:child_process';
import { CROSSFADE_SECONDS, type MixPlan } from './plan';

const BITRATE = '192k';

/**
 * argv, never a shell string: input paths are derived from stored data and
 * must never be parsed by a shell.
 */
export function buildMixArgs(plan: MixPlan, outputPath: string): string[] {
  if (plan.inputs.length === 0) throw new Error('buildMixArgs needs at least one input');

  const args = ['-v', 'error'];
  for (const input of plan.inputs) args.push('-i', input);

  if (plan.inputs.length === 1) {
    args.push('-map', '0:a');
  } else {
    const stages: string[] = [];
    let prev = '0:a';
    for (let i = 1; i < plan.inputs.length; i++) {
      stages.push(
        `[${prev}][${i}:a]acrossfade=d=${CROSSFADE_SECONDS}:c1=tri:c2=tri[a${i}]`,
      );
      prev = `a${i}`;
    }
    args.push('-filter_complex', stages.join(';'), '-map', `[${prev}]`);
  }

  args.push('-c:a', 'libmp3lame', '-b:a', BITRATE, '-y', outputPath);
  return args;
}

/**
 * A signal death gives `code === null` and, under `-v error`, an empty stderr —
 * so the exit code alone says nothing. Name the signal and what it usually
 * means, because that is the only clue the operator gets.
 */
const SIGNAL_CAUSE: Record<string, string> = {
  SIGKILL: 'ran out of memory, or was force-killed',
  SIGTERM: 'the server stopped or restarted mid-render',
  SIGINT: 'the server stopped or restarted mid-render',
  SIGHUP: 'the terminal running the server closed',
};

export function describeExit(
  code: number | null,
  signal: NodeJS.Signals | null,
  stderr: string,
): string {
  const detail = stderr.trim().slice(0, 500);

  if (code === null) {
    const cause = signal ? SIGNAL_CAUSE[signal] : undefined;
    const killed = `ffmpeg was killed by ${signal ?? 'an unknown signal'}`;
    return cause ? `${killed} — ${cause}` : killed;
  }

  return detail ? `ffmpeg exited ${code}: ${detail}` : `ffmpeg exited ${code}`;
}

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args);
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) =>
      reject(new Error(`ffmpeg failed to start: ${error.message}`)),
    );
    child.on('close', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(describeExit(code, signal, stderr))),
    );
  });
}
