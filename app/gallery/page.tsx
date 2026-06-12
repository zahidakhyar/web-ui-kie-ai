import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { UploadsGrid } from '@/components/gallery/UploadsGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Images, Upload } from 'lucide-react';

export const metadata = {
  title: 'Gallery — KIE Image Generator',
};

export default function GalleryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Images className="size-5 text-primary" />
        <h1 className="text-xl font-semibold">Gallery</h1>
      </div>
      <Tabs defaultValue="generated">
        <TabsList className="mb-6">
          <TabsTrigger value="generated" className="gap-1.5">
            <Images className="size-3.5" />
            Generated
          </TabsTrigger>
          <TabsTrigger value="uploads" className="gap-1.5">
            <Upload className="size-3.5" />
            Uploads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generated">
          <GalleryGrid />
        </TabsContent>
        <TabsContent value="uploads">
          <UploadsGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}
