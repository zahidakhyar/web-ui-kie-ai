import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { musicTracks } from '@/lib/schema';
import { syncPendingTasks } from '@/lib/suno/sync';

export async function GET() {
  // Recovers tasks whose client stopped polling before they finished.
  await syncPendingTasks();

  const tracks = db
    .select()
    .from(musicTracks)
    .orderBy(desc(musicTracks.createdAt))
    .limit(100)
    .all();

  return NextResponse.json({ tracks });
}
