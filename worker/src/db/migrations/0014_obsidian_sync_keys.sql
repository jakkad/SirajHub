CREATE TABLE `obsidian_sync_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `digest` text NOT NULL UNIQUE,
  `created_at` integer NOT NULL
);

CREATE INDEX `idx_obsidian_sync_keys_user` ON `obsidian_sync_keys` (`user_id`);
