import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { musicTasks } from '@/lib/schema';
import { getAudioSource, isAudioSourceId } from '@/lib/suno/audio-source';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    prompt?: string;
    source?: string;
    instrumental?: boolean;
    lyrics?: string;
    vocalGender?: string;
    tempo?: number;
    musicalKey?: string;
    targetSeconds?: number;
  };

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const sourceId = body.source ?? 'sounds';
  if (!isAudioSourceId(sourceId)) {
    return NextResponse.json({ error: `unknown source: ${sourceId}` }, { status: 400 });
  }

  const instrumental = body.instrumental ?? true;
  const lyrics = body.lyrics?.trim();

  // Checked here as well as in the audio source, so an obvious mistake is a 400
  // rather than a 502 after the request has already left for Suno.
  if (!instrumental && !lyrics) {
    return NextResponse.json(
      { error: 'lyrics are required when the track is not instrumental' },
      { status: 400 },
    );
  }
  if (body.vocalGender !== undefined && !['m', 'f'].includes(body.vocalGender)) {
    return NextResponse.json({ error: 'vocalGender must be m or f' }, { status: 400 });
  }

  const req = {
    prompt,
    instrumental,
    lyrics,
    vocalGender: body.vocalGender as 'm' | 'f' | undefined,
    tempo: body.tempo,
    musicalKey: body.musicalKey,
    targetSeconds: body.targetSeconds,
  };

  try {
    const taskId = await getAudioSource(sourceId).start(req);

    db.insert(musicTasks)
      .values({
        taskId,
        source: sourceId,
        prompt,
        params: JSON.stringify(req),
        status: 'waiting',
        createdAt: Date.now(),
      })
      .run();

    return NextResponse.json({ taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
