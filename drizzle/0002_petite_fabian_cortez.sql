CREATE TABLE `music_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`source` text NOT NULL,
	`prompt` text NOT NULL,
	`params` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`error_msg` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `music_tasks_task_id_unique` ON `music_tasks` (`task_id`);--> statement-breakpoint
CREATE TABLE `music_tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`audio_id` text NOT NULL,
	`title` text NOT NULL,
	`duration_sec` real NOT NULL,
	`audio_r2_url` text NOT NULL,
	`audio_original_url` text NOT NULL,
	`cover_r2_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `music_tasks`(`task_id`) ON UPDATE no action ON DELETE no action
);
