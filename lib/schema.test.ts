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
    CREATE TABLE music_mixes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mix_id TEXT NOT NULL UNIQUE,
      track_ids TEXT NOT NULL,
      target_seconds INTEGER NOT NULL,
      actual_seconds REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      r2_url TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      error_msg TEXT
    );
    CREATE TABLE video_renders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      render_id TEXT NOT NULL UNIQUE,
      mix_id TEXT NOT NULL,
      image_url TEXT,
      clip_ids TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      r2_url TEXT,
      duration_seconds REAL,
      stage TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      error_msg TEXT
    );
    CREATE TABLE video_clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clip_id TEXT NOT NULL UNIQUE,
      prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      task_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      stage TEXT,
      r2_url TEXT,
      source_seconds REAL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      error_msg TEXT
    );
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
  it('stores a mix and rejects a duplicate mix_id', () => {
    const db = freshDb();
    const row = {
      mixId: 'm1',
      trackIds: '[1,2]',
      targetSeconds: 3600,
      status: 'pending' as const,
      createdAt: 1,
    };
    db.insert(schema.musicMixes).values(row).run();
    expect(() => db.insert(schema.musicMixes).values(row).run()).toThrow(/UNIQUE/);

    const all = db.select().from(schema.musicMixes).all();
    expect(all).toHaveLength(1);
    expect(all[0].r2Url).toBeNull();
  });
  it('stores a video render and rejects a duplicate render_id', () => {
    const db = freshDb();
    const row = {
      renderId: 'r1',
      mixId: 'm1',
      imageUrl: 'https://r2/bg.webp',
      status: 'running' as const,
      createdAt: 1,
    };
    db.insert(schema.videoRenders).values(row).run();
    expect(() => db.insert(schema.videoRenders).values(row).run()).toThrow(/UNIQUE/);

    const all = db.select().from(schema.videoRenders).all();
    expect(all).toHaveLength(1);
    expect(all[0].r2Url).toBeNull();
    expect(all[0].durationSeconds).toBeNull();
  });

  it('stores a render whose visual source is a chain of clips, in order', () => {
    const db = freshDb();
    db.insert(schema.videoRenders)
      .values({
        renderId: 'r2',
        mixId: 'm1',
        clipIds: JSON.stringify(['c1', 'c2', 'c3']),
        status: 'running' as const,
        createdAt: 1,
      })
      .run();

    const [row] = db.select().from(schema.videoRenders).all();
    expect(row.imageUrl).toBeNull();
    expect(JSON.parse(row.clipIds!)).toEqual(['c1', 'c2', 'c3']);
  });

  it('stores a video clip and rejects a duplicate clip_id', () => {
    const db = freshDb();
    const row = {
      clipId: 'c1',
      prompt: 'drifting neon clouds',
      model: 'veo3_lite',
      status: 'running' as const,
      createdAt: 1,
    };
    db.insert(schema.videoClips).values(row).run();
    expect(() => db.insert(schema.videoClips).values(row).run()).toThrow(/UNIQUE/);

    const all = db.select().from(schema.videoClips).all();
    expect(all).toHaveLength(1);
    expect(all[0].r2Url).toBeNull();
    expect(all[0].sourceSeconds).toBeNull();
  });
});
