'use client';

import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { UploadsGrid } from '@/components/gallery/UploadsGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GalleryToolbar } from '@/components/gallery/GalleryToolbar';
import { Images, Upload } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState('generated');
  const [search, setSearch] = useState('');
  const [model, setModel] = useState('all');
  const [sort, setSort] = useState('newest');
  const [gridDensity, setGridDensity] = useState<'compact' | 'comfortable'>('compact');

  // Fetch cheap metadata sizes for badges
  const { data: generatedMeta } = useSWR<{ total: number }>('/api/gallery?limit=1', fetcher);
  const { data: uploadsMeta } = useSWR<{ total: number }>('/api/uploads?limit=1', fetcher);

  const generatedCount = generatedMeta?.total ?? 0;
  const uploadsCount = uploadsMeta?.total ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <PageHeader
        icon={Images}
        title="Gallery"
        subtitle="Everything you've generated and uploaded."
      />

      <Tabs defaultValue="generated" value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Line Variant Tabs Bar */}
        <TabsList variant="line" className="border-b border-border/40 w-full justify-start rounded-none h-10 px-0 gap-6 mb-2">
          <TabsTrigger
            value="generated"
            className="gap-2 text-sm rounded-none py-2 px-1 data-active:border-b-2 data-active:border-primary data-active:text-foreground bg-transparent! cursor-pointer"
          >
            <Images className="size-4" />
            Generated
            <Badge variant="secondary" className="ml-1 bg-muted text-muted-foreground text-[10px] font-mono rounded-full px-1.5 py-0.5">
              {generatedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="uploads"
            className="gap-2 text-sm rounded-none py-2 px-1 data-active:border-b-2 data-active:border-primary data-active:text-foreground bg-transparent! cursor-pointer"
          >
            <Upload className="size-4" />
            Uploads
            <Badge variant="secondary" className="ml-1 bg-muted text-muted-foreground text-[10px] font-mono rounded-full px-1.5 py-0.5">
              {uploadsCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Filters Toolbar */}
        <GalleryToolbar
          search={search}
          onSearchChange={setSearch}
          selectedModel={model}
          onModelChange={setModel}
          sortBy={sort}
          onSortByChange={setSort}
          gridDensity={gridDensity}
          onGridDensityChange={setGridDensity}
          showModelFilter={activeTab === 'generated'}
        />

        <TabsContent value="generated" className="outline-none pt-4">
          <GalleryGrid
            search={search}
            model={model}
            sort={sort}
            gridDensity={gridDensity}
          />
        </TabsContent>
        <TabsContent value="uploads" className="outline-none pt-4">
          <UploadsGrid
            search={search}
            sort={sort}
            gridDensity={gridDensity}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
