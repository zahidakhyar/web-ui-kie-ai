/**
 * In-memory store for KIE task results received via webhook callback.
 * Works correctly in single-process deployments (standard Node.js server).
 * For multi-instance / serverless deployments, swap the Map for Redis or a DB.
 */

export type TaskState = "success" | "fail";

export interface TaskResult {
  state: TaskState;
  resultUrls: string[];
  failCode?: string | null;
  failMsg?: string | null;
}

// taskId → completed result (kept for 10 minutes then auto-cleaned)
const results = new Map<string, TaskResult>();

// taskId → SSE subscriber callbacks
const listeners = new Map<string, Set<(result: TaskResult) => void>>();

export function setTaskResult(taskId: string, result: TaskResult): void {
  results.set(taskId, result);

  const fns = listeners.get(taskId);
  if (fns) {
    for (const fn of fns) fn(result);
    listeners.delete(taskId);
  }

  // Auto-clean after 10 minutes to avoid memory leaks
  setTimeout(() => results.delete(taskId), 10 * 60 * 1000);
}

export function getTaskResult(taskId: string): TaskResult | undefined {
  return results.get(taskId);
}

export function subscribeToTask(
  taskId: string,
  fn: (result: TaskResult) => void
): () => void {
  let set = listeners.get(taskId);
  if (!set) {
    set = new Set();
    listeners.set(taskId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(taskId);
  };
}
