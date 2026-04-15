-- 0015_keyword_snapshots.rollback.sql
DROP TABLE IF EXISTS keyword_snapshots;
ALTER TABLE product_keywords
  DROP COLUMN IF EXISTS auto_analyze,
  DROP COLUMN IF EXISTS analyze_hour;
