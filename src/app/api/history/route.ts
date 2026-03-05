import { NextResponse } from "next/server";

const MOCK_HISTORY = [
  { id: "1", url: "https://picsum.photos/seed/101/400/400", prompt: "A futuristic city at sunset with neon lights", type: "text-to-image", createdAt: "2025-01-15T10:30:00Z" },
  { id: "2", url: "https://picsum.photos/seed/202/400/400", prompt: "Serene mountain landscape with snow-capped peaks", type: "text-to-image", createdAt: "2025-01-14T09:00:00Z" },
  { id: "3", url: "https://picsum.photos/seed/303/400/400", prompt: "Abstract watercolor painting with vivid blues", type: "image-edit", createdAt: "2025-01-13T15:45:00Z" },
  { id: "4", url: "https://picsum.photos/seed/404/400/400", prompt: "Portrait in traditional Japanese attire", type: "text-to-image", createdAt: "2025-01-12T08:20:00Z" },
  { id: "5", url: "https://picsum.photos/seed/505/400/400", prompt: "Cyberpunk alley with glowing signs", type: "text-to-image", createdAt: "2025-01-11T20:15:00Z" },
];

export async function GET() {
  return NextResponse.json({ success: true, history: MOCK_HISTORY });
}
