import { NextRequest, NextResponse } from "next/server";
import { uploadBuffer } from "@/lib/r2";
import { db } from "@/lib/db";
import { uploads } from "@/lib/schema";
import { randomUUID } from "node:crypto";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 },
      );
    }

    const results: string[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json(
          { error: `File type "${file.type}" is not allowed` },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10 MB limit` },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const date = new Date().toISOString().slice(0, 10);
      const key = `uploads/${date}/${randomUUID()}.${ext}`;

      const url = await uploadBuffer(buffer, key, file.type);
      results.push(url);

      await db.insert(uploads).values({
        r2Url: url,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({ urls: results });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
