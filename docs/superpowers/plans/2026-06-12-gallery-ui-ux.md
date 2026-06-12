# Gallery UI/UX Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve UI/UX page Gallery with a custom filtering and search system, density control, tabs counts, and a professional detailed modal viewer with keyboard navigation.

**Architecture:** Add search/filter capabilities to the backend gallery & uploads GET APIs. Introduce `GalleryToolbar` and `ImageDetailModal` components. Refactor `GalleryGrid`, `UploadsGrid`, and `ImageCard` to integrate these controls and use a single active modal state at the grid level for efficient image switching and navigation.

**Tech Stack:** Next.js 16 (React 19), Tailwind CSS v4, Motion, Lucide Icons, SQLite (Drizzle ORM), SWR / SWRInfinite.

---

## File Structure

- **Modify:** [utils.ts](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/lib/utils.ts) - add relative time and file size utility functions.
- **Modify:** [gallery api](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/app/api/gallery/route.ts) - add filter, search, sort, and total count query parameters.
- **Modify:** [uploads api](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/app/api/uploads/route.ts) - add search, sort, and total count query parameters.
- **New Component:** [GalleryToolbar.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/GalleryToolbar.tsx) - filter, sort, search, and grid layout density toggler.
- **New Component:** [ImageDetailModal.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/ImageDetailModal.tsx) - double-column detail viewer with full metadata, action button shortcuts, and arrow keyboard navigation.
- **Modify:** [ImageCard.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/ImageCard.tsx) - adjust click handlers, clean hover overlay, render metadata badges.
- **Modify:** [GalleryGrid.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/GalleryGrid.tsx) - integrate filters, infinite scroll sentinel, and detail modal.
- **Modify:** [UploadsGrid.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/UploadsGrid.tsx) - integrate filters, density controls, and detail modal.
- **Modify:** [page.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/app/gallery/page.tsx) - convert to client component, manage filter states, and display tab counts.

---

## Tasks

### Task 1: Add relative date & file size helper to utils.ts

**Files:**
- Modify: [utils.ts](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/lib/utils.ts)

- [ ] **Step 1: Implement formatRelativeTime and formatBytes utilities**

Add these functions to the end of `lib/utils.ts`:

```typescript
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 2: Verify TypeScript compiles successfully**

Run:
```bash
npx tsc --noEmit
```
Expected output: No compilation errors.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add lib/utils.ts
git commit -m "utils: add relative time and byte formatting helpers"
```

---

### Task 2: Gallery and Uploads API Enhancements

**Files:**
- Modify: [route.ts](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/app/api/gallery/route.ts)
- Modify: [route.ts](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/app/api/uploads/route.ts)

- [ ] **Step 1: Modify Gallery API GET route**

Update the GET function in `app/api/gallery/route.ts` to support filtering by model, searching by prompt, sorting, and returning the total count of matches:

```typescript
import { db } from '@/lib/db';
import { deleteImage } from '@/lib/r2';
import { images, tasks } from '@/lib/schema';
import { and, desc, asc, eq, inArray, like, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '24', 10));
    const offset = (page - 1) * limit;

    const model = searchParams.get('model');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') ?? 'newest';

    const conditions = [eq(tasks.status, 'success')];
    if (model && model !== 'all') {
      conditions.push(eq(tasks.model, model));
    }
    if (search) {
      conditions.push(like(tasks.prompt, `%${search}%`));
    }

    const whereClause = and(...conditions);
    const orderBy = sort === 'oldest' ? [asc(tasks.completedAt)] : [desc(tasks.completedAt)];

    // Get total matching count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    const completedTasks = await db.query.tasks.findMany({
      where: whereClause,
      orderBy,
      limit,
      offset,
    });

    if (completedTasks.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, limit });
    }

    const taskIds = completedTasks.map((t) => t.taskId);
    const taskImages = await db.query.images.findMany({
      where: inArray(images.taskId, taskIds),
      orderBy: (img, { asc }) => [asc(img.id)],
    });

    // Group images by taskId
    const imagesByTask = taskImages.reduce<Record<string, typeof taskImages>>(
      (acc, img) => {
        (acc[img.taskId] ??= []).push(img);
        return acc;
      },
      {},
    );

    const items = completedTasks.map((task) => ({
      ...task,
      images: imagesByTask[task.taskId] ?? [],
    }));

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    console.error('[GET /api/gallery]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Modify Uploads API GET route**

Update the GET function in `app/api/uploads/route.ts` to support search on `fileName`, sorting, and returning a total count:

```typescript
import { db } from '@/lib/db';
import { deleteImage } from '@/lib/r2';
import { uploads } from '@/lib/schema';
import { and, desc, asc, inArray, like, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(
      100,
      Number.parseInt(searchParams.get('limit') ?? '50', 10),
    );
    const offset = Math.max(
      0,
      Number.parseInt(searchParams.get('offset') ?? '0', 10),
    );

    const search = searchParams.get('search');
    const sort = searchParams.get('sort') ?? 'newest';

    const conditions = [];
    if (search) {
      conditions.push(like(uploads.fileName, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderBy = sort === 'oldest' ? asc(uploads.createdAt) : desc(uploads.createdAt);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(uploads)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(uploads)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ uploads: rows, total });
  } catch (err) {
    console.error('[GET /api/uploads]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Run typescript compiler and lint check**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: Success with no errors.

- [ ] **Step 4: Commit changes**

Run:
```bash
git add app/api/gallery/route.ts app/api/uploads/route.ts
git commit -m "api: update gallery and uploads routes to support filtering, sorting, searching"
```

---

### Task 3: Gallery Toolbar Component

**Files:**
- Create: [GalleryToolbar.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/GalleryToolbar.tsx)

- [ ] **Step 1: Write GalleryToolbar implementation**

Create the file `components/gallery/GalleryToolbar.tsx` with search field, model select, sort select, layout density toggles, and debounced typing handler:

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MODELS } from '@/lib/models';
import { Search, X, Grid3X3, LayoutGrid, ArrowUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GalleryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  gridDensity: 'compact' | 'comfortable';
  onGridDensityChange: (value: 'compact' | 'comfortable') => void;
  showModelFilter: boolean;
}

export function GalleryToolbar({
  search,
  onSearchChange,
  selectedModel,
  onModelChange,
  sortBy,
  onSortByChange,
  gridDensity,
  onGridDensityChange,
  showModelFilter,
}: GalleryToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sync state if changed externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const hasActiveFilters = search !== '' || (showModelFilter && selectedModel !== 'all') || sortBy !== 'newest';

  const handleClearFilters = () => {
    setLocalSearch('');
    onSearchChange('');
    onModelChange('all');
    onSortByChange('newest');
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 border-b border-border/40">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center max-w-2xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={showModelFilter ? "Search prompts..." : "Search uploads..."}
            className="pl-9 h-9 rounded-xl bg-card border-border/60 focus-visible:ring-primary/20"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Model Filter (only if showModelFilter is true) */}
        {showModelFilter && (
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-xl border-border/60 bg-card cursor-pointer">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60">
              <SelectItem value="all">All Models</SelectItem>
              {MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2">
        {/* Sort Trigger */}
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="h-9 w-[120px] rounded-xl border-border/60 bg-card cursor-pointer">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60">
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border/40 hidden sm:block" />

        {/* Grid Density Buttons */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onGridDensityChange('compact')}
            className={`h-7 w-7 p-0 rounded-lg cursor-pointer ${gridDensity === 'compact' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            title="Compact grid"
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onGridDensityChange('comfortable')}
            className={`h-7 w-7 p-0 rounded-lg cursor-pointer ${gridDensity === 'comfortable' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            title="Comfortable grid"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 text-xs text-primary hover:bg-primary/5 hover:text-primary rounded-xl cursor-pointer"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typescript compilation**

Run:
```bash
npx tsc --noEmit
```
Expected: Success.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add components/gallery/GalleryToolbar.tsx
git commit -m "gallery: create GalleryToolbar component for search and filtering controls"
```

---

### Task 4: Detail Modal Component

**Files:**
- Create: [ImageDetailModal.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/ImageDetailModal.tsx)

- [ ] **Step 1: Write ImageDetailModal implementation**

Create the file `components/gallery/ImageDetailModal.tsx` containing layout and modal state controllers:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getModelById } from '@/lib/models';
import { GeneratedImage, TaskWithImages } from '@/types';
import { formatRelativeTime, formatBytes } from '@/lib/utils';
import {
  Download,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Calendar,
  Check,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface UploadRecord {
  id: number;
  r2Url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
}

interface ImageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskWithImages;
  image?: GeneratedImage;
  upload?: UploadRecord;
  onPrev?: () => void;
  onNext?: () => void;
  onDelete: () => Promise<void>;
}

export function ImageDetailModal({
  isOpen,
  onClose,
  task,
  image,
  upload,
  onPrev,
  onNext,
  onDelete,
}: ImageDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit');

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onPrev, onNext]);

  const model = task ? getModelById(task.model) : null;
  const imageUrl = image?.r2Url || upload?.r2Url || '';
  const fileName = upload?.fileName || (image ? `${task?.taskId}_${image.id}.webp` : 'image.webp');
  const prompt = task?.prompt || '';
  const createdAt = image?.createdAt || upload?.createdAt || Date.now();
  const width = image?.width;
  const height = image?.height;

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Prompt copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy prompt');
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const handleDeleteClick = async () => {
    if (!confirm('Delete this image? This action cannot be undone.')) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden rounded-2xl border border-border/60 bg-black/95 text-white backdrop-blur-xl h-[90vh] md:h-[80vh] flex flex-col md:flex-row gap-0">
        <DialogTitle className="sr-only">{prompt || fileName}</DialogTitle>

        {/* Left: Image Viewer */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group/viewer h-[50vh] md:h-full border-r border-white/10">
          <div
            className={`relative w-full h-full transition-all duration-300 flex items-center justify-center ${zoom === 'actual' ? 'overflow-auto cursor-zoom-out' : 'cursor-zoom-in'}`}
            onClick={() => setZoom(zoom === 'fit' ? 'actual' : 'fit')}
          >
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={prompt || fileName}
                fill={zoom === 'fit'}
                width={zoom === 'actual' ? (width || 1024) : undefined}
                height={zoom === 'actual' ? (height || 1024) : undefined}
                className={zoom === 'fit' ? 'object-contain p-4' : 'object-none p-4'}
                priority
              />
            )}
          </div>

          {/* Nav buttons */}
          {onPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white border border-white/10 cursor-pointer"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white border border-white/10 cursor-pointer"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Zoom toggle button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(zoom === 'fit' ? 'actual' : 'fit');
            }}
            className="absolute bottom-4 right-4 size-8 rounded-lg bg-black/50 hover:bg-black/80 flex items-center justify-center text-white border border-white/10 cursor-pointer"
          >
            {zoom === 'fit' ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
          </button>
        </div>

        {/* Right: Metadata Panel */}
        <div className="w-full md:w-[380px] bg-zinc-950 flex flex-col h-[40vh] md:h-full justify-between">
          <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
            {task ? (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Generated Image
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/20 border border-primary/20 font-mono text-[10px] tracking-wide uppercase px-2 py-0.5">
                    {model?.name || task.model}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Reference Upload
                </span>
                <h3 className="font-mono text-xs text-zinc-300 break-all truncate" title={fileName}>
                  {fileName}
                </h3>
              </div>
            )}

            {/* Prompt */}
            {prompt && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">Prompt</span>
                  <button
                    onClick={handleCopyPrompt}
                    className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 font-mono transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-white/5 p-3.5 max-h-[160px] overflow-y-auto scrollbar-thin text-sm text-zinc-200 leading-relaxed font-sans select-text whitespace-pre-wrap">
                  {prompt}
                </div>
              </div>
            )}

            {/* Specs */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono text-zinc-400 block border-b border-white/5 pb-1.5">
                Specs
              </span>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-mono text-zinc-300">
                {width && height && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Resolution</span>
                    <span>{width} × {height} px</span>
                  </div>
                )}
                {upload && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">File Size</span>
                    <span>{formatBytes(upload.fileSize)}</span>
                  </div>
                )}
                {upload && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Mime Type</span>
                    <span>{upload.mimeType}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-zinc-500 block">Created</span>
                  <span className="flex items-center gap-1 mt-0.5">
                    <Calendar className="size-3 text-zinc-500" />
                    {formatRelativeTime(createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-white/10 bg-zinc-950/80 flex items-center gap-3">
            <Button
              className="flex-1 rounded-xl bg-white text-black hover:bg-zinc-200 h-10 transition-colors cursor-pointer"
              onClick={handleDownload}
            >
              <Download className="size-4 mr-2" /> Download
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/25 h-10 text-zinc-400 transition-colors cursor-pointer"
              onClick={handleDeleteClick}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify typescript compilation**

Run:
```bash
npx tsc --noEmit
```
Expected: Success.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add components/gallery/ImageDetailModal.tsx
git commit -m "gallery: create ImageDetailModal component for professional lightbox view"
```

---

### Task 5: Refactor ImageCard Component

**Files:**
- Modify: [ImageCard.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/ImageCard.tsx)

- [ ] **Step 1: Simplify ImageCard and bind detail action**

Update `components/gallery/ImageCard.tsx` to remove the inline dialog, expose `onViewDetail`, improve hover states, and add timestamp & dimension badges:

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getModelById } from '@/lib/models';
import { cn, formatRelativeTime } from '@/lib/utils';
import { GeneratedImage, TaskWithImages } from '@/types';
import { Check, Download, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ImageCardProps {
  task: TaskWithImages;
  image: GeneratedImage;
  onViewDetail?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

export function ImageCard({
  task,
  image,
  onViewDetail,
  selectionMode,
  isSelected,
  onToggleSelect,
}: ImageCardProps) {
  const model = getModelById(task.model);

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = image.r2Url;
    a.download = `${task.taskId}_${image.id}.webp`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  function handleCardClick() {
    if (selectionMode) {
      onToggleSelect?.(task.taskId);
    } else {
      onViewDetail?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-muted border transition-all duration-300 hover:-translate-y-0.5 shadow-sm focus:outline-none cursor-pointer',
        selectionMode
          ? 'ring-offset-background'
          : 'border-border/50 hover:border-primary/40 hover:shadow-primary/5',
        isSelected
          ? 'border-primary ring-2 ring-primary/35'
          : 'border-border/50',
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Image Container */}
      <div className="aspect-square overflow-hidden relative">
        <Image
          src={image.r2Url}
          alt={task.prompt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Selection Circle */}
      {selectionMode && (
        <div
          className={cn(
            'absolute inset-0 transition-colors duration-300',
            isSelected ? 'bg-primary/15' : 'bg-transparent',
          )}
        >
          <div
            className={cn(
              'absolute top-2 right-2 size-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
              isSelected
                ? 'bg-primary border-primary scale-110'
                : 'bg-black/40 border-white/70',
            )}
          >
            {isSelected && (
              <Check className="size-3.5 text-primary-foreground" />
            )}
          </div>
        </div>
      )}

      {/* Hover overlay (hidden in selectionMode) */}
      {!selectionMode && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
          {/* Top Info */}
          <div className="flex justify-between items-start gap-1">
            <Badge
              variant="secondary"
              className="text-[9px] bg-black/60 hover:bg-black/60 text-zinc-100 border-0 font-mono tracking-wider uppercase px-1.5 py-0.5"
            >
              {model?.name ?? task.model}
            </Badge>

            {image.width && image.height && (
              <Badge
                variant="secondary"
                className="text-[9px] bg-black/60 hover:bg-black/60 text-zinc-300 border-0 font-mono px-1.5 py-0.5"
              >
                {image.width}x{image.height}
              </Badge>
            )}
          </div>

          {/* Bottom Info */}
          <div className="space-y-2.5">
            <p className="text-white text-xs line-clamp-2 leading-relaxed">
              {task.prompt}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-400 font-mono">
                {formatRelativeTime(image.createdAt)}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail?.();
                  }}
                  title="View details"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                  onClick={handleDownload}
                  title="Download"
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typescript compiler**

Run:
```bash
npx tsc --noEmit
```
Expected: Success.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add components/gallery/ImageCard.tsx
git commit -m "gallery: refactor ImageCard to simplify dialog and style hover overlay"
```

---

### Task 6: Refactor GalleryGrid and UploadsGrid Components

**Files:**
- Modify: [GalleryGrid.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/GalleryGrid.tsx)
- Modify: [UploadsGrid.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/components/gallery/UploadsGrid.tsx)

- [ ] **Step 1: Refactor GalleryGrid to support search, filters, infinite scroll, and modal**

Replace the file `components/gallery/GalleryGrid.tsx` with this code:

```typescript
'use client';

import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GeneratedImage, TaskWithImages } from '@/types';
import { CheckSquare, ImageOff, Loader2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import useSWRInfinite from 'swr/infinite';
import { ImageCard } from './ImageCard';
import { ImageDetailModal } from './ImageDetailModal';

interface GalleryPage {
  items: TaskWithImages[];
  page: number;
  limit: number;
  total: number;
}

interface GalleryGridProps {
  search: string;
  model: string;
  sort: string;
  gridDensity: 'compact' | 'comfortable';
}

const PAGE_LIMIT = 24;

export function GalleryGrid({ search, model, sort, gridDensity }: GalleryGridProps) {
  const getKey = (pageIndex: number, previousPageData: GalleryPage | null) => {
    if (previousPageData && previousPageData.items.length < PAGE_LIMIT) return null;
    
    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      limit: String(PAGE_LIMIT),
      sort,
    });
    if (search) params.append('search', search);
    if (model && model !== 'all') params.append('model', model);
    
    return `/api/gallery?${params.toString()}`;
  };

  const fetcher = (url: string) => fetch(url).then((r) => r.json());

  const { data, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<GalleryPage>(getKey, fetcher, {
      revalidateFirstPage: true,
    });

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  
  // Detail modal index pointer
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const allItems = data ? data.flatMap((p) => p.items) : [];
  const isLoadingMore = isValidating && size > (data?.length ?? 0);
  const isEmpty = !isLoading && allItems.length === 0;
  
  const totalItemsCount = data?.[0]?.total ?? 0;
  const isReachingEnd = isLoading || (data && data[data.length - 1]?.items.length < PAGE_LIMIT);

  // Flatten all images with their parent task
  const flatImages: { task: TaskWithImages; image: GeneratedImage }[] =
    allItems.flatMap((task) => task.images.map((image) => ({ task, image })));

  // Infinite Scroll IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isReachingEnd || isLoadingMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSize((s) => s + 1);
        }
      },
      { rootMargin: '250px' }
    );
    
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [isReachingEnd, isLoadingMore, setSize]);

  const handleDelete = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleSingleDelete = async (taskId: string) => {
    const res = await fetch('/api/gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    if (!res.ok) throw new Error('Delete failed');
    mutate();
  };

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedTaskIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedTaskIds) }),
      });
      if (!res.ok) throw new Error('Batch delete failed');
      toast.success(`Deleted ${selectedTaskIds.size} image(s)`);
      handleExitSelection();
      mutate();
    } catch {
      toast.error('Failed to delete selected images');
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedTaskIds, handleExitSelection, mutate]);

  const hasActiveFilters = search !== '' || (model && model !== 'all') || sort !== 'newest';

  if (isLoading) {
    return (
      <div className={`grid gap-3 ${gridDensity === 'compact' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl bg-card-foreground/5" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <Reveal className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/45 backdrop-blur-sm">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl size-12 animate-pulse" />
          <div className="relative size-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25">
            <ImageOff className="size-5 text-primary" />
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            No images found
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasActiveFilters
              ? 'Try adjusting or clearing your search filters to find what you are looking for.'
              : 'Generate your first image in the studio to start building your gallery.'}
          </p>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          {totalItemsCount} {totalItemsCount === 1 ? 'IMAGE' : 'IMAGES'} MATCHED
        </p>
        {!selectionMode ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
            onClick={() => setSelectionMode(true)}
          >
            <CheckSquare className="size-3.5" />
            Select
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {selectedTaskIds.size} SELECTED
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-xl text-primary hover:bg-primary/5 transition-colors cursor-pointer"
              onClick={handleExitSelection}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className={`grid gap-3 ${gridDensity === 'compact' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {flatImages.map(({ task, image }, index) => (
          <Reveal key={image.id} delay={index * 0.02}>
            <ImageCard
              task={task}
              image={image}
              onViewDetail={() => setActiveIndex(index)}
              selectionMode={selectionMode}
              isSelected={selectedTaskIds.has(task.taskId)}
              onToggleSelect={handleToggleSelect}
            />
          </Reveal>
        ))}
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center">
        {isLoadingMore && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Detail Lightbox Modal */}
      {activeIndex !== null && activeIndex >= 0 && activeIndex < flatImages.length && (
        <ImageDetailModal
          isOpen={activeIndex !== null}
          onClose={() => setActiveIndex(null)}
          task={flatImages[activeIndex].task}
          image={flatImages[activeIndex].image}
          onPrev={activeIndex > 0 ? () => setActiveIndex(activeIndex - 1) : undefined}
          onNext={activeIndex < flatImages.length - 1 ? () => setActiveIndex(activeIndex + 1) : undefined}
          onDelete={() => handleSingleDelete(flatImages[activeIndex].task.taskId)}
        />
      )}

      {/* Floating batch-delete bar */}
      <AnimatePresence>
        {selectionMode && selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ y: 50, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 50, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-full bg-card/95 border border-primary/20 backdrop-blur-md shadow-xl px-5 py-2.5"
          >
            <span className="text-xs font-mono text-muted-foreground tracking-wider">
              {selectedTaskIds.size} SELECTED
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
            >
              {batchDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Refactor UploadsGrid to support search, sort, density, and modal**

Replace the file `components/gallery/UploadsGrid.tsx` with this code:

```typescript
'use client';

import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import {
  CheckSquare,
  Check,
  Download,
  ImageOff,
  Loader2,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { ImageDetailModal } from './ImageDetailModal';

interface UploadRecord {
  id: number;
  r2Url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
}

interface UploadsGridProps {
  search: string;
  sort: string;
  gridDensity: 'compact' | 'comfortable';
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function UploadsGrid({ search, sort, gridDensity }: UploadsGridProps) {
  const params = new URLSearchParams({ limit: '100' });
  if (search) params.append('search', search);
  params.append('sort', sort);

  const { data, isLoading, mutate } = useSWR<{ uploads: UploadRecord[]; total: number }>(
    `/api/uploads?${params.toString()}`,
    fetcher,
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  
  // Modal state pointer
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const uploads = data?.uploads ?? [];
  const totalCount = data?.total ?? uploads.length;
  const isEmpty = !isLoading && uploads.length === 0;

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      setDeleting((prev) => new Set(prev).add(id));
      try {
        const res = await fetch('/api/uploads', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: id }),
        });
        if (!res.ok) throw new Error('Failed to delete');
        mutate();
      } catch {
        toast.error('Failed to delete upload');
      } finally {
        setDeleting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [mutate],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Batch delete failed');
      toast.success(`Deleted ${selectedIds.size} upload(s)`);
      handleExitSelection();
      mutate();
    } catch {
      toast.error('Failed to delete selected uploads');
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedIds, handleExitSelection, mutate]);

  function handleDownload(record: UploadRecord, e?: React.MouseEvent) {
    e?.stopPropagation();
    const a = document.createElement('a');
    a.href = record.r2Url;
    a.download = record.fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  const handleCardClick = (index: number) => {
    if (selectionMode) {
      handleToggleSelect(uploads[index].id);
    } else {
      setActiveIndex(index);
    }
  };

  const hasActiveFilters = search !== '' || sort !== 'newest';

  if (isLoading) {
    return (
      <div className={`grid gap-3 ${gridDensity === 'compact' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl bg-card-foreground/5" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <Reveal className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/45 backdrop-blur-sm">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl size-12 animate-pulse" />
          <div className="relative size-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25">
            <ImageOff className="size-5 text-primary" />
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            No uploads found
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasActiveFilters
              ? 'Try adjusting or clearing your search filters to find what you are looking for.'
              : 'Upload reference images in the studio to start building your uploads collection.'}
          </p>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          {totalCount} {totalCount === 1 ? 'UPLOAD' : 'UPLOADS'} MATCHED
        </p>
        {!selectionMode ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary transition-colors duration-200 cursor-pointer"
            onClick={() => setSelectionMode(true)}
          >
            <CheckSquare className="size-3.5" />
            Select
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {selectedIds.size} SELECTED
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-xl text-primary hover:bg-primary/5 transition-colors cursor-pointer"
              onClick={handleExitSelection}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className={`grid gap-3 ${gridDensity === 'compact' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {uploads.map((record, index) => {
          const isSelected = selectedIds.has(record.id);
          return (
            <Reveal key={record.id} delay={index * 0.02}>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  'group relative overflow-hidden rounded-2xl bg-muted border transition-all duration-300 hover:-translate-y-0.5 shadow-sm focus:outline-none cursor-pointer',
                  selectionMode
                    ? 'ring-offset-background'
                    : 'border-border/50 hover:border-primary/40 hover:shadow-primary/5',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/35'
                    : 'border-border/50',
                )}
                onClick={() => handleCardClick(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(index);
                  }
                }}
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden relative">
                  <Image
                    src={record.r2Url}
                    alt={record.fileName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Selection Circle */}
                {selectionMode && (
                  <div
                    className={cn(
                      'absolute inset-0 transition-colors duration-300',
                      isSelected ? 'bg-primary/15' : 'bg-transparent',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-2 right-2 size-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                        isSelected
                          ? 'bg-primary border-primary scale-110'
                          : 'bg-black/40 border-white/70',
                      )}
                    >
                      {isSelected && (
                        <Check className="size-3.5 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                )}

                {/* Hover overlay (hidden in selectionMode) */}
                {!selectionMode && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                    <div className="flex justify-end" />
                    <div className="space-y-2.5">
                      <p className="text-white text-xs line-clamp-2 leading-relaxed font-mono">
                        {record.fileName}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {formatRelativeTime(record.createdAt)}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveIndex(index);
                            }}
                            title="View details"
                          >
                            <ZoomIn className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                            onClick={(e) => handleDownload(record, e)}
                            title="Download"
                          >
                            <Download className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Modal Detail for Uploads */}
      {activeIndex !== null && activeIndex >= 0 && activeIndex < uploads.length && (
        <ImageDetailModal
          isOpen={activeIndex !== null}
          onClose={() => setActiveIndex(null)}
          upload={uploads[activeIndex]}
          onPrev={activeIndex > 0 ? () => setActiveIndex(activeIndex - 1) : undefined}
          onNext={activeIndex < uploads.length - 1 ? () => setActiveIndex(activeIndex + 1) : undefined}
          onDelete={() => handleDelete(uploads[activeIndex].id)}
        />
      )}

      {/* Floating batch-delete bar */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 50, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 50, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-full bg-card/95 border border-primary/20 backdrop-blur-md shadow-xl px-5 py-2.5"
          >
            <span className="text-xs font-mono text-muted-foreground tracking-wider">
              {selectedIds.size} SELECTED
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
            >
              {batchDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Verify typescript compiling**

Run:
```bash
npx tsc --noEmit
```
Expected: Success.

- [ ] **Step 4: Commit changes**

Run:
```bash
git add components/gallery/GalleryGrid.tsx components/gallery/UploadsGrid.tsx
git commit -m "gallery: integrate filters, infinite scroll and image detail modal in grids"
```

---

### Task 7: Gallery Page Layout & Tabs styling

**Files:**
- Modify: [page.tsx](file:///Users/macbook/Repositories/Projects/web-ui-kie-ai/app/gallery/page.tsx)

- [ ] **Step 1: Implement full page client controller and line tabs**

Update `app/gallery/page.tsx` with search/filter state, fetching dynamic total counts for badges, and rendering `GalleryToolbar`:

```typescript
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
```

- [ ] **Step 2: Verify application builds and runs properly**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: Success with no errors.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add app/gallery/page.tsx
git commit -m "gallery: redesign layout page, integrate Toolbar, and style tabs"
```

---

## Verification Plan

### Automated Checks
- Compile verification: `npx tsc --noEmit`
- Linter verification: `npm run lint`
- Build verification: `npm run build`

### Manual Verification
1. Open the dev server: `npm run dev`.
2. Visit `/gallery`.
3. Check the "Generated" tab count badge and "Uploads" tab count badge.
4. Type in the search input and verify results filter automatically after 300ms debounce.
5. Filter by different models on the "Generated" tab. Verify that the model selector disappears when switching to "Uploads".
6. Click any card to open the `ImageDetailModal`.
   - Verify layout is split: image on left, specs/details on right.
   - Verify keyboard navigates with ArrowLeft/ArrowRight.
   - Verify zoom features (fit vs actual size).
   - Test "Copy" and "Download" buttons.
   - Test the "Delete" button and check confirmation dialog.
7. Switch between Compact and Comfortable density layouts and check grid visual responsiveness.
8. Scroll down to trigger infinite scroll for the Generated tab.
