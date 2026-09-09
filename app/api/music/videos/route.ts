import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videoRenders } from '@/lib/schema';

export async function GET() {
  const videos = db
    .select()
    .from(videoRenders)
    .orderBy(desc(videoRenders.createdAt))
    .limit(50)
    .all();
  return NextResponse.json({ videos });
}
