const VEO_BASE = 'https://api.kie.ai/api/v1/veo';

/** Cheapest tier that still returns 1080p: 30 credits for 8s, plus 5 for the upgrade. */
export const VEO_MODEL = 'veo3_lite';

/** Veo rejects nothing for a placeholder callback, and we poll instead. */
const CALLBACK_PLACEHOLDER = 'https://example.com/cb';

/** Fixed by the model — Veo 3.1 exposes no duration parameter. */
export const VEO_CLIP_SECONDS = 8;

export interface VeoRecord {
  successFlag: number;
  errorMessage?: string | null;
  response?: { resultUrls?: string[] | null } | null;
}

export type VeoOutcome =
  | { kind: 'pending' }
  | { kind: 'failed'; errorMsg: string }
  | { kind: 'ready'; url: string };

export function buildVeoRequest(prompt: string, callBackUrl: string) {
  return {
    prompt,
    model: VEO_MODEL,
    generationType: 'TEXT_2_VIDEO',
    aspect_ratio: '16:9',
    callBackUrl,
  };
}

/** successFlag: 0 generating, 1 success, 2 failed, 3 upstream generation failed. */
export function readVeoRecord(record: VeoRecord): VeoOutcome {
  if (record.successFlag === 0) return { kind: 'pending' };

  const url = record.response?.resultUrls?.[0];
  if (record.successFlag === 1 && url) return { kind: 'ready', url };

  return {
    kind: 'failed',
    errorMsg: record.errorMessage || 'Veo finished without returning a video.',
  };
}

function authHeaders(): HeadersInit {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) throw new Error('KIE_API_KEY environment variable is not set.');
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

/** kie.ai replies HTTP 200 even for errors, so the body `code` is the only signal. */
async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json()) as { code: number; msg: string; data: T };
  if (json.code !== 200) throw new Error(json.msg || `Veo API error ${json.code}`);
  return json.data;
}

export async function createVeoTask(prompt: string): Promise<string> {
  const res = await fetch(`${VEO_BASE}/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(buildVeoRequest(prompt, CALLBACK_PLACEHOLDER)),
  });
  const data = await unwrap<{ taskId: string }>(res);
  return data.taskId;
}

export async function getVeoRecord(taskId: string): Promise<VeoRecord> {
  const res = await fetch(`${VEO_BASE}/record-info?taskId=${encodeURIComponent(taskId)}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return unwrap<VeoRecord>(res);
}

/**
 * The 1080p upgrade is a *separate* task: this returns a new taskId that has to
 * be polled on record-info like any other. Costs 5 credits on top of the 30.
 */
export async function requestVeo1080p(taskId: string): Promise<string> {
  const res = await fetch(
    `${VEO_BASE}/get-1080p-video?taskId=${encodeURIComponent(taskId)}&index=0`,
    { headers: authHeaders(), cache: 'no-store' },
  );
  const data = await unwrap<{ taskId: string }>(res);
  return data.taskId;
}
