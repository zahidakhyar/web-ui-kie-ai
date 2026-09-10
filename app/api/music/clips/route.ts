import { desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videoClips } from '@/lib/schema';
import { startClip } from '@/lib/video/clip-job';

const MAX_PROMPT_CHARS = 5000;

export async function GET() {
  const clips = db
    .select()
    .from(videoClips)
    .orderBy(desc(videoClips.createdAt))
    .limit(50)
    .all();
  return NextResponse.json({ clips });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { prompt?: unknown };

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `prompt must be at most ${MAX_PROMPT_CHARS} characters` },
      { status: 400 },
    );
  }

  return NextResponse.json({ clipId: startClip(prompt) });
}
