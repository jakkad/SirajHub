ALTER TABLE `items` ADD `hidden_from_recommendations` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `items` ADD `manual_boost` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `items` ADD `cooldown_until` integer;
