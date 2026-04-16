ALTER TABLE `items` ADD `suggest_metric_needs_more_info` integer DEFAULT false NOT NULL;
ALTER TABLE `items` ADD `suggest_metric_more_info_request` text;
ALTER TABLE `items` ADD `suggest_metric_model_used` text;
