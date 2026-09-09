import { NextRequest, NextResponse } from 'next/server';
import { startMix } from '@/lib/audio/assemble';

const PRESET_SECONDS = [300, 900, 1800, 3600];
const MAX_TRACKS = 20;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { trackIds?: unknown; targetSeconds?: unknown };

  const trackIds = Array.isArray(body.trackIds)
    ? body.trackIds.filter((v): v is number => Number.isInteger(v))
    : [];
  if (trackIds.length === 0) {
    return NextResponse.json({ error: 'trackIds is required' }, { status: 400 });
  }
  if (trackIds.length > MAX_TRACKS) {
    return NextResponse.json({ error: `at most ${MAX_TRACKS} tracks` }, { status: 400 });
  }
  if (!PRESET_SECONDS.includes(body.targetSeconds as number)) {
    return NextResponse.json(
      { error: `targetSeconds must be one of ${PRESET_SECONDS.join(', ')}` },
      { status: 400 },
    );
  }

  const mixId = await startMix(trackIds, body.targetSeconds as number);
  return NextResponse.json({ mixId });
}
