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
