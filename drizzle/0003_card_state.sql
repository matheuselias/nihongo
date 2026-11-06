CREATE TABLE `card_state` (
	`word_id` text NOT NULL,
	`direction` text NOT NULL,
	`interval_days` real NOT NULL,
	`ease` real NOT NULL,
	`due_at` integer NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`wrong_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`word_id`, `direction`)
);
