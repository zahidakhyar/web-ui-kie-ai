import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { musicMixes } from '@/lib/schema';
import { getClip } from '@/lib/video/clip-job';
import { MAX_CLIPS } from '@/lib/video/loop';
import { startRender } from '@/lib/video/render';

/**
 * The renderer downloads imageUrl server-side, so an arbitrary URL would be an
 * SSRF vector. Only our own R2 origin is accepted.
 */
function isAllowedImageUrl(raw: string): boolean {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return false;
  try {
    return new URL(raw).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    mixId?: unknown;
    imageUrl?: unknown;
    clipIds?: unknown;
  };

  const mixId = typeof body.mixId === 'string' ? body.mixId : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  const clipIds = Array.isArray(body.clipIds)
    ? body.clipIds.filter((v): v is string => typeof v === 'string')
    : [];

  if (!mixId) return NextResponse.json({ error: 'mixId is required' }, { status: 400 });

  if (Boolean(imageUrl) === (clipIds.length > 0)) {
    return NextResponse.json(
      { error: 'exactly one of imageUrl or clipIds is required' },
      { status: 400 },
    );
  }

  if (clipIds.length > MAX_CLIPS) {
    return NextResponse.json(
      { error: `at most ${MAX_CLIPS} clips` },
      { status: 400 },
    );
  }

  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    return NextResponse.json(
      { error: 'imageUrl must be hosted on this app’s own storage' },
      { status: 400 },
    );
  }

  for (const clipId of clipIds) {
    const clip = getClip(clipId);
    if (!clip) return NextResponse.json({ error: 'unknown clipId' }, { status: 400 });
    if (clip.status !== 'success') {
      return NextResponse.json({ error: 'clip is not ready yet' }, { status: 400 });
    }
  }

  const mix = db.select().from(musicMixes).where(eq(musicMixes.mixId, mixId)).get();
  if (!mix) return NextResponse.json({ error: 'unknown mixId' }, { status: 400 });
  if (mix.status !== 'success') {
    return NextResponse.json({ error: 'mix is not ready yet' }, { status: 400 });
  }

  const renderId = await startRender(mixId, {
    imageUrl: imageUrl || null,
    clipIds: clipIds.length ? clipIds : null,
  });
  return NextResponse.json({ renderId });
}
