-- 0007_master_triggers.sql
-- Automatic fingerprint change detection for Category A master tables.
--
-- Behavior (see docs/Technical_Specification_v1.0.md §1.2.4):
--   On UPDATE of any Category A master row:
--     1. If NEW.fingerprint = OLD.fingerprint → only touch last_seen_at.
--        (Caller's attempt to modify other fields is dropped to avoid
--         silent drift: same fingerprint ⇒ no semantic change.)
--     2. If NEW.fingerprint != OLD.fingerprint → record a diff in change_log
--        and set NEW.updated_at = now().
--
--   Crawlers therefore simply upsert rows with a freshly-computed fingerprint
--   and rely on this trigger to manage updated_at + audit history.

------------------------------------------------------------------
-- Shared trigger function
------------------------------------------------------------------
CREATE OR REPLACE FUNCTION master_row_update() RETURNS trigger AS $$
DECLARE
  diff JSONB;
BEGIN
  IF NEW.fingerprint IS NULL THEN
    RAISE EXCEPTION
      'master_row_update: NEW.fingerprint must not be NULL on table %',
      TG_TABLE_NAME;
  END IF;

  IF NEW.fingerprint = OLD.fingerprint THEN
    -- No semantic change. Preserve the old row state except for observation
    -- timestamp, so crawler re-observations remain idempotent.
    NEW := OLD;
    NEW.last_seen_at := now();
    NEW.is_stale := false;
    RETURN NEW;
  END IF;

  -- Semantic change. Compute a compact diff and record it.
  SELECT jsonb_object_agg(
           k,
           jsonb_build_object('from', o.value, 'to', n.value)
         )
    INTO diff
  FROM jsonb_each(to_jsonb(OLD)) AS o(k, value)
  FULL OUTER JOIN jsonb_each(to_jsonb(NEW)) AS n(k, value) USING (k)
  WHERE o.value IS DISTINCT FROM n.value
    AND k NOT IN ('last_seen_at', 'updated_at', 'collected_at');

  IF diff IS NOT NULL AND diff <> '{}'::jsonb THEN
    INSERT INTO change_log (table_name, record_id, diff)
    VALUES (TG_TABLE_NAME, NEW.id, diff);
  END IF;

  NEW.updated_at := now();
  NEW.last_seen_at := now();
  NEW.is_stale := false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------------
-- Attach the trigger to every Category A master table that carries the
-- common contract (source_uid + fingerprint + last_seen_at + updated_at).
-- fx_rates is intentionally EXCLUDED — its natural key is (base,quote,observed_at)
-- and it stores append-only snapshots, so no row is ever updated.
------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'buyers', 'competitors', 'market_trends',
    'rights_deals', 'bestsellers'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_master_update
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION master_row_update()',
      t, t
    );
  END LOOP;
END$$;

------------------------------------------------------------------
-- Scheduled stale-marker helper: callers can run this from a batch job to
-- flip is_stale=true for rows not observed in the last 7 days. Kept as a
-- function so the scheduler can call it per table without repeating SQL.
------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_stale_rows(p_table TEXT, p_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  EXECUTE format(
    'UPDATE %I SET is_stale = true
       WHERE is_stale = false
         AND last_seen_at < now() - ($1 || '' days'')::interval',
    p_table
  ) USING p_days;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;
