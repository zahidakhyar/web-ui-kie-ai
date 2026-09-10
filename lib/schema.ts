import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id').notNull().unique(),
  model: text('model').notNull(),
  prompt: text('prompt').notNull(),
  params: text('params').notNull(), // JSON string of full input params
  status: text('status', { enum: ['pending', 'waiting', 'success', 'fail'] })
    .notNull()
    .default('pending'),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
  errorMsg: text('error_msg'),
});

export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.taskId),
  r2Url: text('r2_url').notNull(),
  originalUrl: text('original_url').notNull(),
  width: real('width'),
  height: real('height'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  // The webhook and the orphan-recovery sweep can both land the same result.
  // A read-then-write guard races; the constraint has to be here.
  uniqueIndex('images_task_original_unique').on(table.taskId, table.originalUrl),
]);

export const uploads = sqliteTable('uploads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  r2Url: text('r2_url').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const musicTasks = sqliteTable('music_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id').notNull().unique(),
  source: text('source', { enum: ['sounds', 'generate'] }).notNull(),
  prompt: text('prompt').notNull(),
  params: text('params').notNull(), // JSON string of the AudioSourceRequest
  status: text('status', { enum: ['pending', 'waiting', 'success', 'fail'] })
    .notNull()
    .default('pending'),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
  errorMsg: text('error_msg'),
});

export const musicTracks = sqliteTable('music_tracks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id')
    .notNull()
    .references(() => musicTasks.taskId),
  audioId: text('audio_id').notNull(), // Suno's per-variation id
  title: text('title').notNull(),
  durationSec: real('duration_sec').notNull(),
  audioR2Url: text('audio_r2_url').notNull(),
  audioOriginalUrl: text('audio_original_url').notNull(),
  coverR2Url: text('cover_r2_url'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  // Two concurrent syncs of the same task must not both insert. The DB is the
  // only place this can be enforced; a read-then-write guard races.
  uniqueIndex('music_tracks_task_audio_unique').on(table.taskId, table.audioId),
]);

export const musicMixes = sqliteTable('music_mixes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mixId: text('mix_id').notNull().unique(),
  trackIds: text('track_ids').notNull(), // JSON array of musicTracks.id
  targetSeconds: integer('target_seconds').notNull(),
  actualSeconds: real('actual_seconds'),
  status: text('status', { enum: ['pending', 'running', 'success', 'fail'] })
    .notNull()
    .default('pending'),
  r2Url: text('r2_url'),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
  errorMsg: text('error_msg'),
});

export const videoClips = sqliteTable('video_clips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clipId: text('clip_id').notNull().unique(),
  prompt: text('prompt').notNull(),
  model: text('model').notNull(),
  /** Veo's generate task, then the 1080p upgrade, which gets a different id. */
  taskId: text('task_id'),
  status: text('status', { enum: ['pending', 'running', 'success', 'fail'] })
    .notNull()
    .default('pending'),
  stage: text('stage', {
    enum: ['queued', 'generating', 'upgrading', 'normalizing', 'uploading'],
  }),
  r2Url: text('r2_url'),
  /** Length of the stored clip. The seam is closed at render time, not here. */
  sourceSeconds: real('source_seconds'),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
  errorMsg: text('error_msg'),
});

export const videoRenders = sqliteTable('video_renders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  renderId: text('render_id').notNull().unique(),
  mixId: text('mix_id').notNull(),
  /** Exactly one of imageUrl / clipIds is set. */
  imageUrl: text('image_url'),
  /** JSON array of videoClips.clipId, chained in order into one seamless loop. */
  clipIds: text('clip_ids'),
  status: text('status', { enum: ['pending', 'running', 'success', 'fail'] })
    .notNull()
    .default('pending'),
  r2Url: text('r2_url'),
  durationSeconds: real('duration_seconds'),
  /** Which ffmpeg step is running, so the UI can report more than a spinner. */
  stage: text('stage', {
    // 'boomerang' is retired but kept so rows written before the
    // single-pass pan still read back.
    enum: ['queued', 'downloading', 'clip', 'boomerang', 'muxing', 'uploading'],
  }),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
  errorMsg: text('error_msg'),
});
