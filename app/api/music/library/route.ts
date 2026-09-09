import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { musicTracks } from '@/lib/schema';

export async function GET() {
  const tracks = db
    .select()
    .from(musicTracks)
    .orderBy(desc(musicTracks.createdAt))
    .limit(100)
    .all();

  return NextResponse.json({ tracks });
}
