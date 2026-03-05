import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Max 10 MB per file
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

// Module-level singleton — only created when R2 env vars are present at first use
let _r2: S3Client | null = null;
function getR2Client(): S3Client {
  if (!_r2) {
    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2;
}

async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `uploads/${filename}`;
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  // R2_PUBLIC_URL e.g. "https://pub-xxx.r2.dev" or a custom domain
  return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
}

async function uploadToLocal(buffer: Buffer, filename: string): Promise<string> {
  if (!process.env.APP_BASE_URL) {
    throw new Error(
      "APP_BASE_URL is not set. KIE API needs an absolute URL to fetch uploaded images. " +
        "Set APP_BASE_URL to your public server root (e.g. https://your-domain.com) or use R2."
    );
  }
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  const base = process.env.APP_BASE_URL.replace(/\/$/, "");
  return `${base}/uploads/${filename}`;
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "No file field in form data" },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { success: false, error: "File must be an image" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "File exceeds 10 MB limit" },
      { status: 400 }
    );
  }

  // Validate extension against allowlist
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ext = rawExt.replace(/[^a-z0-9]/g, "");
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { success: false, error: `Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.${ext}`;

  const isR2 =
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL;

  try {
    const url = isR2
      ? await uploadToR2(buffer, filename, file.type)
      : await uploadToLocal(buffer, filename);

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error("[upload] error:", err);
    const message = err instanceof Error ? err.message : "Upload failed. Check server logs.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

