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

      {/* Drag Divider Line (with wider touch target) */}
      <div
        className="absolute top-0 bottom-0 w-8 -ml-4 cursor-ew-resize z-20 select-none flex items-center justify-center"
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Divider line visual */}
        <div className="absolute inset-y-0 w-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
        
        {/* Handle Button */}
        <div className="absolute size-9 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center border-2 border-background cursor-ew-resize hover:scale-110 active:scale-95 transition-all duration-200 z-30">
          <ChevronsLeftRight className="size-4 shrink-0" />
        </div>
      </div>

      {/* Overlay Badges */}
      <div className="absolute left-4 top-4 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase text-white backdrop-blur-md border border-white/10 pointer-events-none">
        Before
      </div>
      <div className="absolute right-4 top-4 z-10 rounded-full bg-primary/95 px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase text-primary-foreground shadow-sm pointer-events-none animate-pulse">
        After
      </div>
    </div>
  );
}
