import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const count = body.count ?? 1;

  await new Promise((resolve) => setTimeout(resolve, 100));

  const images = Array.from({ length: count }, (_, i) => {
    const seed = Math.floor(Math.random() * 900) + 100 + i * 37;
    return {
      id: `img-${Date.now()}-${i}`,
      url: `https://picsum.photos/seed/${seed}/600/600`,
      prompt: body.prompt,
      style: body.style ?? "photorealistic",
      aspectRatio: body.aspectRatio ?? "1:1",
      quality: body.quality ?? "standard",
      createdAt: new Date().toISOString(),
    };
  });

  return NextResponse.json({ success: true, images });
}
