import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, images } from "@/lib/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { deleteImage } from "@/lib/r2";

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

// DELETE a task (or batch of tasks) and their images
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      taskId?: string;
      taskIds?: string[];
    };

    // Normalise to an array of task IDs
    const ids: string[] = [];
    if (body.taskIds?.length) {
      ids.push(...body.taskIds);
    } else if (body.taskId) {
      ids.push(body.taskId);
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "taskId or taskIds is required" },
        { status: 400 },
      );
    }

    // Fetch all images so we can remove them from R2
    const taskImages = await db.query.images.findMany({
      where: inArray(images.taskId, ids),
    });

    // Delete from R2 (best-effort — log failures but don't abort)
    await Promise.allSettled(
      taskImages.map(async (img) => {
        try {
          const key = new URL(img.r2Url).pathname.slice(1);
          await deleteImage(key);
        } catch (err) {
          console.error(
            "[DELETE /api/gallery] R2 delete failed",
            img.r2Url,
            err,
          );
        }
      }),
    );

    // Delete from DB
    await db.delete(images).where(inArray(images.taskId, ids));
    await db.delete(tasks).where(inArray(tasks.taskId, ids));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/gallery]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
