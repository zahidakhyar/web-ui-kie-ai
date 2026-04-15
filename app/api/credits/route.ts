import { NextResponse } from "next/server";
import { getCredits } from "@/lib/kie-ai";

export async function GET() {
  try {
    const credits = await getCredits();
    return NextResponse.json({ credits });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch credits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
