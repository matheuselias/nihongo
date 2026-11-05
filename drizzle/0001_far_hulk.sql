CREATE TABLE `step_mistakes` (
	`lesson_id` text NOT NULL,
	`step_id` text NOT NULL,
	`word_id` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`lesson_id`, `step_id`)
);
