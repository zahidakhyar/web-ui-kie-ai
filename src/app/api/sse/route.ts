import { NextRequest } from "next/server";
import {
  getTaskResult,
  subscribeToTask,
  type TaskResult,
} from "@/lib/task-store";

const SSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/sse?taskId=...
 *
 * Server-Sent Events stream.  Fires as soon as /api/callback receives the
 * KIE webhook for the given taskId.  Falls back to a timeout event after
 * SSE_TIMEOUT_MS if no callback arrives.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return new Response("taskId is required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const encode = (data: TaskResult | { state: string }) =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  // If the callback already arrived, respond immediately without streaming
  const existing = getTaskResult(taskId);
  if (existing) {
    return new Response(encode(existing), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Hold the connection open and push the result when the callback fires
  let unsubscribe: (() => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Keepalive comment every 20 s so load-balancers/proxies don't drop the connection
      const keepaliveId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepaliveId);
        }
      }, 20_000);

      unsubscribe = subscribeToTask(taskId, (result) => {
        clearInterval(keepaliveId);
        if (timeoutId) clearTimeout(timeoutId);
        try {
          controller.enqueue(encode(result));
          controller.close();
        } catch {
          // connection already closed by client
        }
      });

      timeoutId = setTimeout(() => {
        clearInterval(keepaliveId);
        unsubscribe?.();
        try {
          controller.enqueue(encode({ state: "timeout" }));
          controller.close();
        } catch {
          // already closed
        }
      }, SSE_TIMEOUT_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepaliveId);
        if (timeoutId) clearTimeout(timeoutId);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
