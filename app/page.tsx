'use client';

import { GenerationProgress } from '@/components/generator/GenerationProgress';
import { GeneratorForm } from '@/components/generator/GeneratorForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GeneratedImage } from '@/types';
import { Wand2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';

interface ActiveTask {
  taskId: string;
  done: boolean;
  images: GeneratedImage[];
}

export default function HomePage() {
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTaskCreated = useCallback((taskId: string) => {
    setActiveTasks((prev) => [{ taskId, done: false, images: [] }, ...prev]);
    setIsGenerating(false);
  }, []);

  const handleComplete = useCallback(
    (taskId: string, images: GeneratedImage[]) => {
      setActiveTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId ? { ...t, done: true, images } : t,
        ),
      );
      toast.success(
        `Generated ${images.length} image${images.length !== 1 ? 's' : ''}!`,
      );
      // Refresh the credits display in the header
      mutate('/api/credits');
    },
    [],
  );

  const handleError = useCallback((taskId: string, msg: string) => {
    setActiveTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, done: true } : t)),
    );
    toast.error(msg);
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setActiveTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <PageHeader
        icon={Wand2}
        eyebrow="Studio"
        title="Generate"
        subtitle="Describe it, pick a model, and watch it render."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* Left panel: form */}
        <div className="lg:sticky lg:top-20">
          <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-sm shadow-sm shadow-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                <Wand2 className="size-4 text-primary animate-pulse" />
                Image Generator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GeneratorForm
                onTaskCreated={(taskId) => {
                  setIsGenerating(true);
                  handleTaskCreated(taskId);
                }}
                disabled={isGenerating}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right panel: progress & results */}
        <div className="space-y-4">
          {activeTasks.length === 0 ? (
            <Reveal className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/45 backdrop-blur-sm">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl size-12 animate-pulse" />
                <div className="relative size-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25">
                  <Wand2 className="size-5 text-primary" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Your canvas is empty
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fill in the details on the left and click generate to start.
                </p>
              </div>
              <div className="hidden lg:block text-xs text-muted-foreground/60">
                ← Configure your prompt to start
              </div>
            </Reveal>
          ) : (
            <div className="space-y-4">
              {/* Sticky Sub-toolbar */}
              <div className="sticky top-[4.5rem] z-30 flex items-center justify-between py-2.5 bg-background/80 backdrop-blur-md border-b border-border/40 rounded-xl px-3 mb-2">
                <p className="text-xs font-mono text-muted-foreground tracking-wider">
                  {activeTasks.length} {activeTasks.length === 1 ? 'TASK' : 'TASKS'}
                </p>
                {activeTasks.some((t) => t.done) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-primary hover:text-primary/85 hover:bg-primary/5 rounded-lg px-2.5 transition-colors"
                    onClick={() =>
                      setActiveTasks((prev) => prev.filter((t) => !t.done))
                    }
                  >
                    Clear completed
                  </Button>
                )}
              </div>

              {activeTasks.map((task, index) => (
                <Reveal key={task.taskId} delay={index * 0.08}>
                  <GenerationProgress
                    taskId={task.taskId}
                    onComplete={(images) => handleComplete(task.taskId, images)}
                    onError={(msg) => handleError(task.taskId, msg)}
                    onDelete={() => handleDelete(task.taskId)}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
