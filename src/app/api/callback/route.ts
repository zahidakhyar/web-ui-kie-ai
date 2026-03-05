import { NextRequest, NextResponse } from "next/server";
import { setTaskResult } from "@/lib/task-store";

/**
 * POST /api/callback
 *
 * Receives task-completion webhooks from the KIE.ai API.
 * Set KIE_CALLBACK_URL=https://your-domain.com/api/callback in your environment
 * and pass it as `callBackUrl` when creating a task.
 *
 * KIE callback payload:
 *   { taskId, state, resultJson, failCode, failMsg, ... }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    taskId?: string;
    state?: string;
    resultJson?: string | { resultUrls?: string[] };
    failCode?: string;
    failMsg?: string;
  };

  const { taskId, state, resultJson, failCode, failMsg } = body;

  if (!taskId || !state) {
    return NextResponse.json(
      { success: false, error: "Missing taskId or state" },
      { status: 400 }
    );
  }

  // Only store terminal states; acknowledge intermediate ones
  if (state !== "success" && state !== "fail") {
    return NextResponse.json({ success: true });
  }

  let resultUrls: string[] = [];
  if (state === "success" && resultJson) {
    try {
      const parsed =
        typeof resultJson === "string"
          ? (JSON.parse(resultJson) as { resultUrls?: string[] })
          : resultJson;
      resultUrls = parsed.resultUrls ?? [];
    } catch (err) {
      console.error("Failed to parse resultJson in callback:", err);
    }
  }

  setTaskResult(taskId, {
    state,
    resultUrls,
    failCode: failCode ?? null,
    failMsg: failMsg ?? null,
  });

  return NextResponse.json({ success: true });
}
