-- 0006_roles.sql
-- Enforce Category A / B write boundary at the database level.
-- See docs/Technical_Specification_v1.0.md §1.1.
--
-- Two NOLOGIN roles that application code connects AS (via SET ROLE after
-- authenticating with the base user). We do NOT create passwords here — the
-- application user is the Railway-managed `postgres` owner role.
--
--   batch_worker       — Category A tables: full RW. No access to reports/raw_posts.
--   signalcraft_worker — Category A tables: SELECT only.
--                        Category B tables (raw_posts/signalcraft_jobs/reports): full RW.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'batch_worker') THEN
    CREATE ROLE batch_worker NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'signalcraft_worker') THEN
    CREATE ROLE signalcraft_worker NOLOGIN;
  END IF;
END$$;

-- Category A master tables
GRANT SELECT, INSERT, UPDATE, DELETE ON
  buyers, competitors, market_trends, fx_rates, rights_deals, bestsellers,
  change_log, crawler_failures
  TO batch_worker;

GRANT SELECT ON
  buyers, competitors, market_trends, fx_rates, rights_deals, bestsellers
  TO signalcraft_worker;

-- Category B tables
GRANT SELECT, INSERT, UPDATE, DELETE ON
  signalcraft_jobs, raw_posts, reports
  TO signalcraft_worker;

-- Shared operational tables
GRANT SELECT, INSERT ON events, email_events, llm_usage
  TO batch_worker, signalcraft_worker;

-- Sequences: both roles need to use BIGSERIAL/SERIAL sequences they write to
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO batch_worker, signalcraft_worker;

-- Future tables added in later migrations: default privileges will apply.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO batch_worker, signalcraft_worker;
