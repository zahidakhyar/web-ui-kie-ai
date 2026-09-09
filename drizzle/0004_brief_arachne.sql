CREATE TABLE `music_mixes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mix_id` text NOT NULL,
	`track_ids` text NOT NULL,
	`target_seconds` integer NOT NULL,
	`actual_seconds` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`r2_url` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`error_msg` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `music_mixes_mix_id_unique` ON `music_mixes` (`mix_id`);