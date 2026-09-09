import type {
  GenerateMusicInput,
  GenerateSoundsInput,
  SunoEnvelope,
  SunoRecord,
  SunoTaskRef,
} from './types';

const SUNO_BASE = 'https://api.kie.ai/api/v1';

/** Suno rejects a missing callBackUrl with code 422, but accepts any well-formed URL. We poll. */
const CALLBACK_PLACEHOLDER = 'https://example.com/cb';

export class SunoError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
    this.name = 'SunoError';
  }
}

function authHeaders(): HeadersInit {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) throw new Error('KIE_API_KEY environment variable is not set.');
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

/** kie.ai replies HTTP 200 even for errors, so the body `code` is the only reliable signal. */
async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json()) as SunoEnvelope<T>;
  if (json.code !== 200) {
    throw new SunoError(json.msg || `Suno API error ${json.code}`, json.code);
  }
  return json.data;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUNO_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return unwrap<T>(res);
}

export async function generateSounds(input: GenerateSoundsInput): Promise<string> {
  const data = await post<SunoTaskRef>('/generate/sounds', input);
  return data.taskId;
}

export async function generateMusic(input: GenerateMusicInput): Promise<string> {
  const data = await post<SunoTaskRef>('/generate', {
    ...input,
    callBackUrl: CALLBACK_PLACEHOLDER,
  });
  return data.taskId;
}

export async function getMusicRecord(taskId: string): Promise<SunoRecord> {
  const url = new URL(`${SUNO_BASE}/generate/record-info`);
  url.searchParams.set('taskId', taskId);
  const res = await fetch(url.toString(), { headers: authHeaders(), cache: 'no-store' });
  return unwrap<SunoRecord>(res);
}
