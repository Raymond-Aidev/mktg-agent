-- 0007_master_triggers.rollback.sql
DROP FUNCTION IF EXISTS mark_stale_rows(TEXT, INTEGER);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'buyers', 'competitors', 'market_trends',
    'rights_deals', 'bestsellers'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_master_update ON %I', t, t);
  END LOOP;
END$$;

DROP FUNCTION IF EXISTS master_row_update();
