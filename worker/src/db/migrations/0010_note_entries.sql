CREATE TABLE `note_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `item_id` text NOT NULL,
  `entry_type` text NOT NULL,
  `content` text NOT NULL,
  `context` text,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_note_entries_item_position` ON `note_entries` (`item_id`,`position`);
--> statement-breakpoint
CREATE INDEX `idx_note_entries_user_type` ON `note_entries` (`user_id`,`entry_type`);
