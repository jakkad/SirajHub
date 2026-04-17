CREATE TABLE `reminder_states` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `item_id` text NOT NULL,
  `reminder_type` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `snoozed_until` integer,
  `dismissed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reminder_states_user_type` ON `reminder_states` (`user_id`,`reminder_type`);
--> statement-breakpoint
CREATE INDEX `idx_reminder_states_item_type` ON `reminder_states` (`item_id`,`reminder_type`);
