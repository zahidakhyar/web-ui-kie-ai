import { NextResponse } from 'next/server';
import { getClip } from '@/lib/video/clip-job';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await params;
  const clip = getClip(clipId);
  if (!clip) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(clip);
}
