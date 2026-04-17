CREATE TABLE `import_source_mappings` (
  `id` text PRIMARY KEY NOT NULL,
  `import_job_id` text NOT NULL,
  `item_id` text,
  `duplicate_of_item_id` text,
  `source` text NOT NULL,
  `source_record_id` text,
  `source_url` text,
  `raw_title` text,
  `raw_creator` text,
  `payload` text,
  `status` text DEFAULT 'created' NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`import_job_id`) REFERENCES `import_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`duplicate_of_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_import_source_mappings_job` ON `import_source_mappings` (`import_job_id`);
CREATE INDEX `idx_import_source_mappings_item` ON `import_source_mappings` (`item_id`);
CREATE INDEX `idx_import_source_mappings_source_record` ON `import_source_mappings` (`source`,`source_record_id`);
