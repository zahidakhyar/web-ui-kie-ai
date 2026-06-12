'use client';

import { GenerationProgress } from '@/components/generator/GenerationProgress';
import { GeneratorForm } from '@/components/generator/GeneratorForm';
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
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* Left panel: form */}
        <div className="lg:sticky lg:top-[4.5rem]">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="size-4 text-primary" />
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
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 rounded-xl border-2 border-dashed border-border/50">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Wand2 className="size-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">
                  Your generations will appear here
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Fill in the form and click Generate to start.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}
                </p>
                {activeTasks.some((t) => t.done) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      setActiveTasks((prev) => prev.filter((t) => !t.done))
                    }
                  >
                    Clear completed
                  </Button>
                )}
              </div>

              {activeTasks.map((task) => (
                <GenerationProgress
                  key={task.taskId}
                  taskId={task.taskId}
                  onComplete={(images) => handleComplete(task.taskId, images)}
                  onError={(msg) => handleError(task.taskId, msg)}
                  onDelete={() => handleDelete(task.taskId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
