import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { UploadsGrid } from '@/components/gallery/UploadsGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Images, Upload } from 'lucide-react';

export const metadata = {
  title: 'Gallery - KIE Image Generator',
};

export default function GalleryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <PageHeader
        icon={Images}
        title="Gallery"
        subtitle="Everything you've generated and uploaded."
      />

      <Tabs defaultValue="generated">
        <TabsList className="mb-6 bg-muted/60 p-1 rounded-full max-w-[280px]">
          <TabsTrigger
            value="generated"
            className="gap-1.5 text-xs rounded-full py-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Images className="size-3.5" />
            Generated
          </TabsTrigger>
          <TabsTrigger
            value="uploads"
            className="gap-1.5 text-xs rounded-full py-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Upload className="size-3.5" />
            Uploads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generated" className="outline-none">
          <GalleryGrid />
        </TabsContent>
        <TabsContent value="uploads" className="outline-none">
          <UploadsGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}
