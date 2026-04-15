import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploads } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(
      100,
      Number.parseInt(searchParams.get("limit") ?? "50", 10),
    );
    const offset = Math.max(
      0,
      Number.parseInt(searchParams.get("offset") ?? "0", 10),
    );

    const rows = await db
      .select()
      .from(uploads)
      .orderBy(desc(uploads.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ uploads: rows });
  } catch (err) {
    console.error("[GET /api/uploads]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
