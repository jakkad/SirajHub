CREATE TABLE `lists` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `color` text DEFAULT '#94a3b8' NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lists_user_position` ON `lists` (`user_id`,`position`);
--> statement-breakpoint
CREATE TABLE `list_items` (
  `list_id` text NOT NULL,
  `item_id` text NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `added_at` integer NOT NULL,
  PRIMARY KEY(`list_id`, `item_id`),
  FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_list_items_list_position` ON `list_items` (`list_id`,`position`);
--> statement-breakpoint
CREATE INDEX `idx_list_items_item` ON `list_items` (`item_id`);
