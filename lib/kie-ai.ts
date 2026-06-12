import {
  KieCreateTaskRequest,
  KieCreateTaskResponse,
  KieQueryResponse,
} from '@/types';

const KIE_API_BASE = 'https://api.kie.ai/api/v1';

function getAuthHeaders(): HeadersInit {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) throw new Error('KIE_API_KEY environment variable is not set.');
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export async function createTask(
  payload: KieCreateTaskRequest,
): Promise<KieCreateTaskResponse> {
  const res = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<KieCreateTaskResponse>;
}

export async function queryTask(taskId: string): Promise<KieQueryResponse> {
  const url = new URL(`${KIE_API_BASE}/jobs/recordInfo`);
  url.searchParams.set('taskId', taskId);

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<KieQueryResponse>;
}

export async function getCredits(): Promise<number> {
  const res = await fetch(`${KIE_API_BASE}/chat/credit`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    code: number;
    msg: string;
    data: number;
  };
  if (json.code !== 200) {
    throw new Error(`KIE API error: ${json.msg}`);
  }

  return json.data;
}
