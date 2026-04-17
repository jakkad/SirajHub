ALTER TABLE `items` ADD `progress_percent` integer;
ALTER TABLE `items` ADD `progress_current` integer;
ALTER TABLE `items` ADD `progress_total` integer;
ALTER TABLE `items` ADD `last_touched_at` integer;

CREATE TABLE `saved_views` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `scope` text DEFAULT 'collection' NOT NULL,
  `content_type` text,
  `filters` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_saved_views_user_scope` ON `saved_views` (`user_id`,`scope`);
CREATE INDEX `idx_saved_views_user_type` ON `saved_views` (`user_id`,`content_type`);

CREATE TABLE `import_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `source` text NOT NULL,
  `source_label` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `duplicate_strategy` text DEFAULT 'skip' NOT NULL,
  `total_rows` integer DEFAULT 0 NOT NULL,
  `created_count` integer DEFAULT 0 NOT NULL,
  `duplicate_count` integer DEFAULT 0 NOT NULL,
  `failed_count` integer DEFAULT 0 NOT NULL,
  `metadata` text,
  `result` text,
  `last_error` text,
  `completed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_import_jobs_user_created` ON `import_jobs` (`user_id`,`created_at`);
