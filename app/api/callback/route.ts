import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, images } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { uploadImageFromUrl, buildR2Key } from "@/lib/r2";
import { KieTaskRecord } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code: number;
      msg: string;
      data: KieTaskRecord;
    };

    const record = body.data;

    if (!record?.taskId) {
      return NextResponse.json(
        { error: "Invalid callback payload" },
        { status: 400 },
      );
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.taskId, record.taskId),
    });

    if (!task) {
      // Unknown task — ignore silently (might be from a different env)
      return NextResponse.json({ ok: true });
    }

    if (record.state === "success" && record.resultJson) {
      let resultUrls: string[] = [];
      try {
        const parsed = JSON.parse(record.resultJson) as {
          resultUrls?: string[];
        };
        resultUrls = parsed.resultUrls ?? [];
      } catch {
        console.error("Failed to parse resultJson:", record.resultJson);
      }

      // Upload each image to R2
      const uploadedImages = await Promise.allSettled(
        resultUrls.map(async (url, i) => {
          const ext = url.split(".").pop()?.split("?")[0] ?? "webp";
          const key = buildR2Key(record.taskId, i, ext);
          const r2Url = await uploadImageFromUrl(url, key);
          return { url, r2Url };
        }),
      );

      const now = Date.now();

      // Insert images that succeeded
      for (let i = 0; i < uploadedImages.length; i++) {
        const result = uploadedImages[i];
        if (result.status === "fulfilled") {
          await db.insert(images).values({
            taskId: record.taskId,
            r2Url: result.value.r2Url,
            originalUrl: result.value.url,
            createdAt: now,
          });
        } else {
          console.error(`Failed to upload image ${i}:`, result.reason);
        }
      }

      await db
        .update(tasks)
        .set({
          status: "success",
          completedAt: record.completeTime ?? now,
        })
        .where(eq(tasks.taskId, record.taskId));
    } else if (record.state === "fail") {
      await db
        .update(tasks)
        .set({
          status: "fail",
          completedAt: Date.now(),
          errorMsg: record.failMsg ?? "Generation failed",
        })
        .where(eq(tasks.taskId, record.taskId));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/callback]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
