import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryTask } from '@/lib/kie-ai';
import { buildR2Key, uploadImageFromUrl } from '@/lib/r2';
import { images, tasks } from '@/lib/schema';

const STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * The image pipeline is webhook-only and `callBackUrl` is built from
 * NEXT_PUBLIC_APP_URL, so in local dev — and after any missed webhook — a task
 * stays 'waiting' forever even though kie.ai already finished. Verified live.
 */
export async function syncPendingImageTasks(): Promise<void> {
  const pending = db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.status, 'waiting'), gt(tasks.createdAt, Date.now() - STALE_AFTER_MS)),
    )
    .all();

  for (const task of pending) {
    try {
      const record = (await queryTask(task.taskId)).data;
      if (record.state === 'waiting') continue;

      if (record.state === 'fail') {
        db.update(tasks)
          .set({ status: 'fail', errorMsg: record.failMsg, completedAt: Date.now() })
          .where(eq(tasks.taskId, task.taskId))
          .run();
        continue;
      }

      const urls = record.resultJson
        ? ((JSON.parse(record.resultJson) as { resultUrls?: string[] }).resultUrls ?? [])
        : [];

      for (const [index, url] of urls.entries()) {
        const r2Url = await uploadImageFromUrl(url, buildR2Key(task.taskId, index));
        db.insert(images)
          .values({ taskId: task.taskId, r2Url, originalUrl: url, createdAt: Date.now() })
          .onConflictDoNothing()
          .run();
      }

      db.update(tasks)
        .set({ status: 'success', completedAt: Date.now() })
        .where(eq(tasks.taskId, task.taskId))
        .run();
    } catch {
      // Leave it pending; the next sweep retries. A transient kie.ai blip must
      // not permanently fail an image the user may still receive.
    }
  }
}
