import { EventEmitter } from "node:events";

// Singleton that survives Next.js hot-module reloads in development
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;

export const taskEvents: EventEmitter =
  g.__taskEventEmitter ?? new EventEmitter();

g.__taskEventEmitter = taskEvents;

// Allow many concurrent SSE listeners
taskEvents.setMaxListeners(500);
