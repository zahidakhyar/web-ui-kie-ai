import { spawn } from 'node:child_process';

export function parseProbeSeconds(stdout: string): number {
  const seconds = Number(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`ffprobe reported no usable duration: ${stdout.trim() || '(empty)'}`);
  }
  return seconds;
}

/**
 * The encoded length, not the length that was asked for. A clip requested as
 * 8s can land at 7.96s, and `-shortest` then trims the tail off the audio.
 */
export function probeSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) =>
      reject(new Error(`ffprobe failed to start: ${error.message}`)),
    );
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited ${code}: ${stderr.trim()}`));
      try {
        resolve(parseProbeSeconds(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
}
