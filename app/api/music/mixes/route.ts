import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { musicMixes } from '@/lib/schema';

export async function GET() {
  const mixes = db
    .select()
    .from(musicMixes)
    .orderBy(desc(musicMixes.createdAt))
    .limit(50)
    .all();
  return NextResponse.json({ mixes });
}
