import { NextResponse } from 'next/server';
import { getMix } from '@/lib/audio/assemble';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mixId: string }> },
) {
  const { mixId } = await params;
  const mix = getMix(mixId);
  if (!mix) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(mix);
}
