import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { createTask } from "@/lib/kie-ai";
import { getModelById } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, params } = body as {
      modelId: string;
      params: Record<string, unknown>;
    };

    if (!modelId || !params) {
      return NextResponse.json(
        { error: "modelId and params are required" },
        { status: 400 },
      );
    }

    const model = getModelById(modelId);
    if (!model) {
      return NextResponse.json({ error: "Unknown model" }, { status: 400 });
    }

    // Build callback URL from env or request origin
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const callBackUrl = `${appUrl}/api/callback`;

    const kieResponse = await createTask({
      model: modelId,
      input: params,
      callBackUrl,
    });

    if (kieResponse.code !== 200) {
      return NextResponse.json(
        { error: kieResponse.msg ?? "Failed to create task" },
        { status: 500 },
      );
    }

    const taskId = kieResponse.data.taskId;
    const prompt = (params.prompt as string) ?? "";

    await db.insert(tasks).values({
      taskId,
      model: modelId,
      prompt,
      params: JSON.stringify(params),
      status: "waiting",
      createdAt: Date.now(),
    });

    return NextResponse.json({ taskId });
  } catch (err) {
    console.error("[POST /api/generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
