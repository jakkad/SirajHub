ALTER TABLE `items` ADD `page_count` integer;
--> statement-breakpoint
UPDATE `items`
SET `page_count` = CAST(json_extract(`metadata`, '$.pageCount') AS integer)
WHERE `content_type` = 'book'
  AND `metadata` IS NOT NULL
  AND json_valid(`metadata`)
  AND json_type(CASE WHEN json_valid(`metadata`) THEN `metadata` ELSE '{}' END, '$.pageCount') IN ('integer', 'real')
  AND CAST(json_extract(CASE WHEN json_valid(`metadata`) THEN `metadata` ELSE '{}' END, '$.pageCount') AS integer) > 0
  AND json_extract(CASE WHEN json_valid(`metadata`) THEN `metadata` ELSE '{}' END, '$.pageCount') = CAST(json_extract(CASE WHEN json_valid(`metadata`) THEN `metadata` ELSE '{}' END, '$.pageCount') AS integer);
--> statement-breakpoint
UPDATE `items`
SET `metadata` = json_remove(`metadata`, '$.pageCount')
WHERE `content_type` = 'book'
  AND `metadata` IS NOT NULL
  AND json_valid(`metadata`)
  AND json_type(CASE WHEN json_valid(`metadata`) THEN `metadata` ELSE '{}' END, '$.pageCount') IS NOT NULL;
