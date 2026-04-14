import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, images } from "@/lib/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "24", 10));
    const offset = (page - 1) * limit;

    const completedTasks = await db.query.tasks.findMany({
      where: eq(tasks.status, "success"),
      orderBy: [desc(tasks.completedAt)],
      limit,
      offset,
    });

    if (completedTasks.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, limit });
    }

    const taskIds = completedTasks.map((t) => t.taskId);
    const taskImages = await db.query.images.findMany({
      where: inArray(images.taskId, taskIds),
      orderBy: (img, { asc }) => [asc(img.id)],
    });

    // Group images by taskId
    const imagesByTask = taskImages.reduce<Record<string, typeof taskImages>>(
      (acc, img) => {
        (acc[img.taskId] ??= []).push(img);
        return acc;
      },
      {},
    );

    const items = completedTasks.map((task) => ({
      ...task,
      images: imagesByTask[task.taskId] ?? [],
    }));

    return NextResponse.json({ items, page, limit });
  } catch (err) {
    console.error("[GET /api/gallery]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE a task and its images
export async function DELETE(request: NextRequest) {
  try {
    const { taskId } = (await request.json()) as { taskId: string };
    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 },
      );
    }

    await db.delete(images).where(eq(images.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.taskId, taskId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/gallery]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
