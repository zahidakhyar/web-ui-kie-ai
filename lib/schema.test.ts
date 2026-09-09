import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import * as schema from './schema';

function freshDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE music_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      prompt TEXT NOT NULL,
      params TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      error_msg TEXT
    );
    CREATE TABLE music_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL REFERENCES music_tasks(task_id),
      audio_id TEXT NOT NULL,
      title TEXT NOT NULL,
      duration_sec REAL NOT NULL,
      audio_r2_url TEXT NOT NULL,
      audio_original_url TEXT NOT NULL,
      cover_r2_url TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX music_tracks_task_audio_unique
      ON music_tracks (task_id, audio_id);
  `);
  return drizzle(sqlite, { schema });
}

describe('music schema', () => {
  it('stores a task and its two track variations', () => {
    const db = freshDb();
    db.insert(schema.musicTasks)
      .values({
        taskId: 't1',
        source: 'sounds',
        prompt: 'lofi',
        params: '{}',
        status: 'success',
        createdAt: 1,
      })
      .run();

    for (const audioId of ['a1', 'a2']) {
      db.insert(schema.musicTracks)
        .values({
          taskId: 't1',
          audioId,
          title: 'Lofi',
          durationSec: 20.76,
          audioR2Url: `https://r2/${audioId}.mp3`,
          audioOriginalUrl: `https://suno/${audioId}.mp3`,
          createdAt: 1,
        })
        .run();
    }

    const tracks = db
      .select()
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.taskId, 't1'))
      .all();

    expect(tracks).toHaveLength(2);
    expect(tracks[0].durationSec).toBeCloseTo(20.76);
    expect(tracks[0].coverR2Url).toBeNull();
  });

  it('refuses a duplicate (task_id, audio_id) so concurrent syncs cannot double-insert', () => {
    const db = freshDb();
    db.insert(schema.musicTasks)
      .values({ taskId: 't1', source: 'sounds', prompt: 'lofi', params: '{}', createdAt: 1 })
      .run();

    const row = {
      taskId: 't1',
      audioId: 'a1',
      title: 'Lofi',
      durationSec: 20.76,
      audioR2Url: 'https://r2/a1.mp3',
      audioOriginalUrl: 'https://suno/a1.mp3',
      createdAt: 1,
    };

    db.insert(schema.musicTracks).values(row).run();
    expect(() => db.insert(schema.musicTracks).values(row).run()).toThrow(/UNIQUE/);

    // onConflictDoNothing is what sync.ts uses: it must swallow the collision.
    db.insert(schema.musicTracks).values(row).onConflictDoNothing().run();

    const all = db.select().from(schema.musicTracks).all();
    expect(all).toHaveLength(1);
  });
});
