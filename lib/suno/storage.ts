import { uploadBuffer } from '@/lib/r2';

function dateFolder(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildMusicKey(taskId: string, audioId: string, ext: string): string {
  return `music/${dateFolder()}/${taskId}_${audioId}.${ext}`;
}

async function mirror(
  sourceUrl: string,
  key: string,
  contentType: string,
  what: string,
): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${what} from ${sourceUrl}: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadBuffer(buffer, key, contentType);
}

export function mirrorAudio(
  sourceUrl: string,
  taskId: string,
  audioId: string,
): Promise<string> {
  return mirror(sourceUrl, buildMusicKey(taskId, audioId, 'mp3'), 'audio/mpeg', 'audio');
}

export function mirrorCover(
  sourceUrl: string,
  taskId: string,
  audioId: string,
): Promise<string> {
  return mirror(sourceUrl, buildMusicKey(taskId, audioId, 'jpeg'), 'image/jpeg', 'cover');
}
