CREATE TABLE `video_renders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`render_id` text NOT NULL,
	`mix_id` text NOT NULL,
	`image_url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`r2_url` text,
	`duration_seconds` real,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`error_msg` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `video_renders_render_id_unique` ON `video_renders` (`render_id`);