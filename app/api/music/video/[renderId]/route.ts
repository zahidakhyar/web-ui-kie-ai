import { NextResponse } from 'next/server';
import { getRender } from '@/lib/video/render';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ renderId: string }> },
) {
  const { renderId } = await params;
  const render = getRender(renderId);
  if (!render) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(render);
}
