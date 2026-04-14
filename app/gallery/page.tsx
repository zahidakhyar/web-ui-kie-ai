import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Images } from "lucide-react";

export const metadata = {
  title: "Gallery — KIE Image Generator",
};

export default function GalleryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Images className="size-5 text-primary" />
        <h1 className="text-xl font-semibold">Gallery</h1>
      </div>
      <GalleryGrid />
    </div>
  );
}
