CREATE TABLE `ai_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `item_id` text,
  `job_type` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `payload` text NOT NULL,
  `result` text,
  `model_used` text,
  `attempts` integer DEFAULT 0 NOT NULL,
  `max_attempts` integer DEFAULT 3 NOT NULL,
  `last_error` text,
  `run_after` integer NOT NULL,
  `completed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_jobs_user_status_run_after` ON `ai_jobs` (`user_id`,`status`,`run_after`);
--> statement-breakpoint
CREATE INDEX `idx_ai_jobs_item_type` ON `ai_jobs` (`item_id`,`job_type`);
