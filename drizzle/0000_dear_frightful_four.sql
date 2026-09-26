CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`amount` real NOT NULL,
	`category` text NOT NULL,
	`note` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`monthly_budget` real DEFAULT 900 NOT NULL,
	`rent` real DEFAULT 0 NOT NULL,
	`dietary` text DEFAULT '' NOT NULL
);
