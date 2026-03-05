import { NextRequest, NextResponse } from "next/server";

const KIE_API_BASE = "https://api.kie.ai/api/v1";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json(
      { success: false, error: "taskId is required" },
      { status: 400 }
    );
  }

  if (!process.env.KIE_API_KEY) {
    return NextResponse.json(
      { success: false, error: "KIE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const res = await fetch(
    `${KIE_API_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KIE_API_KEY}`,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: `KIE API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const task = data?.data;

  if (!task) {
    return NextResponse.json(
      { success: false, error: "No task data returned" },
      { status: 502 }
    );
  }

  const state: string = task.state;
  let resultUrls: string[] = [];

  if (state === "success" && task.resultJson) {
    try {
      const parsed = JSON.parse(task.resultJson) as { resultUrls?: string[] };
      resultUrls = parsed.resultUrls ?? [];
    } catch (err) {
      console.error("Failed to parse resultJson from KIE API:", err);
    }
  }

  return NextResponse.json({
    success: true,
    taskId,
    state,
    resultUrls,
    failCode: task.failCode ?? null,
    failMsg: task.failMsg ?? null,
  });
}
