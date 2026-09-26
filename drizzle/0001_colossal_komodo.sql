CREATE TABLE `cooked_meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`meal_id` text NOT NULL,
	`cooked_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`amount` real NOT NULL,
	`source` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `settings` ADD `opening_balance` real DEFAULT 0 NOT NULL;