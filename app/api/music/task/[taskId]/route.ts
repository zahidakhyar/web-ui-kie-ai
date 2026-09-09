import { NextResponse } from 'next/server';
import { syncTask } from '@/lib/suno/sync';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const view = await syncTask(taskId);
  if (!view) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(view);
}
