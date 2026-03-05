import { NextRequest, NextResponse } from "next/server";

const KIE_API_BASE = "https://api.kie.ai/api/v1";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, aspectRatio, quality, count } = body;

  // Use mock when no API key is configured
  if (!process.env.KIE_API_KEY) {
    const images = Array.from({ length: count ?? 1 }, (_, i) => {
      const seed = Math.floor(Math.random() * 900) + 100 + i * 37;
      return {
        id: `img-${Date.now()}-${i}`,
        url: `https://picsum.photos/seed/${seed}/600/600`,
        prompt,
        aspectRatio: aspectRatio ?? "1:1",
        quality: quality ?? "basic",
        createdAt: new Date().toISOString(),
      };
    });
    return NextResponse.json({ success: true, images });
  }

  const res = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "seedream/4.5-text-to-image",
      callBackUrl: process.env.KIE_CALLBACK_URL,
      input: {
        prompt,
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
