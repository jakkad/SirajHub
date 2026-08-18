UPDATE `items` SET `rating` = NULL WHERE `rating` IS NOT NULL;
--> statement-breakpoint
UPDATE `saved_views`
SET `filters` = json_remove(`filters`, '$.minRating')
WHERE json_type(`filters`, '$.minRating') IS NOT NULL;
