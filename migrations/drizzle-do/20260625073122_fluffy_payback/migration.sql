CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
