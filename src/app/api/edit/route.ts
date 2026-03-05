import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  await new Promise((resolve) => setTimeout(resolve, 100));

  const seed = Math.floor(Math.random() * 900) + 100;
  const image = {
    id: `edit-${Date.now()}`,
    url: `https://picsum.photos/seed/${seed}/600/600`,
    prompt: body.prompt,
    options: {
      keepPose: body.keepPose ?? false,
      keepLighting: body.keepLighting ?? false,
      keepColors: body.keepColors ?? false,
    },
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ success: true, image });
}
