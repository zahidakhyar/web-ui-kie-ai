import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tasks, images } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { taskEvents } from "@/lib/task-events";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const encoder = new TextEncoder();

  const initialTask = await db.query.tasks.findFirst({
    where: eq(tasks.taskId, taskId),
  });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let timeoutId: ReturnType<typeof setTimeout>;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // stream already closed
        }
      };

      // Declared with let so close() can reference it before assignment
      let onUpdate: (updatedTaskId: string) => Promise<void>;

      const close = () => {
        if (closed) return;
        closed = true;
        if (onUpdate) taskEvents.removeListener("task:updated", onUpdate);
        clearTimeout(timeoutId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Send initial state
      const initialImages =
        initialTask?.status === "success"
          ? await db.query.images.findMany({
              where: eq(images.taskId, taskId),
            })
          : [];

      send({
        type: "update",
        task: initialTask ?? null,
        images: initialImages,
      });

      if (initialTask?.status === "success" || initialTask?.status === "fail") {
        close();
        return;
      }

      onUpdate = async (updatedTaskId: string) => {
        if (updatedTaskId !== taskId || closed) return;

        const updatedTask = await db.query.tasks.findFirst({
          where: eq(tasks.taskId, taskId),
        });
        const taskImages = await db.query.images.findMany({
          where: eq(images.taskId, taskId),
        });

        send({ type: "update", task: updatedTask ?? null, images: taskImages });

        if (
          updatedTask?.status === "success" ||
          updatedTask?.status === "fail"
        ) {
          close();
        }
      };

      taskEvents.on("task:updated", onUpdate);

      // Auto-close after 10 minutes
      timeoutId = setTimeout(
        () => {
          send({ type: "timeout" });
          close();
        },
        10 * 60 * 1000,
      );

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
