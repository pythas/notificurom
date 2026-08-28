CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`repository` text,
	`author` text,
	`author_avatar_url` text,
	`status` text DEFAULT 'inbox' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`metadata` text,
	`source_created_at` text NOT NULL,
	`source_updated_at` text,
	`status_updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_source_id_unique` ON `tasks` (`source_id`);