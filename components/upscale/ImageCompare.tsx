'use client';

import { ChevronsLeftRight } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ImageCompareProps {
  beforeUrl: string;
  afterUrl: string;
  className?: string;
}

export function ImageCompare({
  beforeUrl,
  afterUrl,
  className,
}: ImageCompareProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percentage);
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove],
  );

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX);
      }
    },
    [isDragging, handleMove],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp, onTouchMove]);

  function handleMouseDown() {
    setIsDragging(true);
  }

  function handleTouchStart() {
    setIsDragging(true);
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square md:aspect-[4/3] max-h-[600px] overflow-hidden rounded-xl border border-border bg-muted select-none group ${className}`}
    >
      {/* After Image (Background) */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={afterUrl}
          alt="Upscaled output"
          fill
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-contain"
          priority
        />
      </div>

      {/* Before Image (Foreground, clipped) */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)`,
        }}
      >
        <Image
          src={beforeUrl}
          alt="Original input"
          fill
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-contain"
          priority
        />
      </div>

      {/* Drag Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Handle Button */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-9 rounded-full bg-white text-black shadow-xl flex items-center justify-center border border-border cursor-ew-resize hover:scale-105 active:scale-95 transition-transform z-30">
          <ChevronsLeftRight className="size-4 shrink-0 text-zinc-700" />
        </div>
      </div>

      {/* Overlay Badges */}
      <div className="absolute left-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/10 pointer-events-none">
        Original
      </div>
      <div className="absolute right-4 top-4 z-10 rounded-full bg-primary/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur-md pointer-events-none">
        Upscaled
      </div>
    </div>
  );
}
