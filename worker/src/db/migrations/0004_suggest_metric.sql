ALTER TABLE `items` ADD `suggest_metric_base` integer;
ALTER TABLE `items` ADD `suggest_metric_final` integer;
ALTER TABLE `items` ADD `suggest_metric_updated_at` integer;
ALTER TABLE `items` ADD `suggest_metric_reason` text;
ALTER TABLE `items` ADD `trending_boost_enabled` integer DEFAULT false NOT NULL;
