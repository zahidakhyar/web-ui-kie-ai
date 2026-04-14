import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, images } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.taskId, taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskImages = await db.query.images.findMany({
      where: eq(images.taskId, taskId),
      orderBy: (img, { asc }) => [asc(img.id)],
    });

    return NextResponse.json({ task, images: taskImages });
  } catch (err) {
    console.error("[GET /api/task/:taskId]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
