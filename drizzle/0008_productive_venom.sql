CREATE TABLE `video_clips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clip_id` text NOT NULL,
	`prompt` text NOT NULL,
	`model` text NOT NULL,
	`task_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`stage` text,
	`r2_url` text,
	`loop_seconds` real,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`error_msg` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `video_clips_clip_id_unique` ON `video_clips` (`clip_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_video_renders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`render_id` text NOT NULL,
	`mix_id` text NOT NULL,
	`image_url` text,
	`clip_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`r2_url` text,
	`duration_seconds` real,
	`stage` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`error_msg` text
);
--> statement-breakpoint
INSERT INTO `__new_video_renders`("id", "render_id", "mix_id", "image_url", "clip_id", "status", "r2_url", "duration_seconds", "stage", "created_at", "completed_at", "error_msg") SELECT "id", "render_id", "mix_id", "image_url", NULL, "status", "r2_url", "duration_seconds", "stage", "created_at", "completed_at", "error_msg" FROM `video_renders`;--> statement-breakpoint
DROP TABLE `video_renders`;--> statement-breakpoint
ALTER TABLE `__new_video_renders` RENAME TO `video_renders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `video_renders_render_id_unique` ON `video_renders` (`render_id`);