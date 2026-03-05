import { NextRequest, NextResponse } from "next/server";

const KIE_API_BASE = "https://api.kie.ai/api/v1";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, imageUrl, aspectRatio, quality } = body;

  // Use mock when no API key is configured or when imageUrl is a data URL
  // (KIE API requires a publicly accessible image URL)
  if (!process.env.KIE_API_KEY || !imageUrl || imageUrl.startsWith("data:")) {
    const seed = Math.floor(Math.random() * 900) + 100;
    const image = {
      id: `edit-${Date.now()}`,
      url: `https://picsum.photos/seed/${seed}/600/600`,
      prompt,
      options: {
        keepPose: body.keepPose ?? false,
        keepLighting: body.keepLighting ?? false,
        keepColors: body.keepColors ?? false,
      },
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, image });
  }

  const res = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "seedream/4.5-edit",
      callBackUrl: process.env.KIE_CALLBACK_URL,
      input: {
        prompt,
        image_urls: [imageUrl],
        aspect_ratio: aspectRatio ?? "1:1",
        quality: quality ?? "basic",
      },
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: `KIE API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const taskId = data?.data?.taskId;

  if (typeof taskId !== "string" || !taskId) {
    return NextResponse.json(
      { success: false, error: "No taskId returned from KIE API" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, taskId });
}
