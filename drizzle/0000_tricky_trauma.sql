CREATE TABLE `lesson_progress` (
	`lesson_id` text PRIMARY KEY NOT NULL,
	`best_score` integer NOT NULL,
	`completed` integer NOT NULL,
	`last_completed_at` integer
);
