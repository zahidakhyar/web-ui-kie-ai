import { getCredits } from '@/lib/kie-ai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const credits = await getCredits();
    return NextResponse.json({ credits });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch credits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
