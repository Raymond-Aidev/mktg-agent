-- 0016_dlq_circuit_breaker.rollback.sql

DROP INDEX IF EXISTS circuit_breaker_state_open_idx;
DROP TABLE IF EXISTS circuit_breaker_state;

DROP INDEX IF EXISTS crawler_failures_bull_job_idx;
DROP INDEX IF EXISTS crawler_failures_terminal_idx;

ALTER TABLE crawler_failures
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS is_terminal,
  DROP COLUMN IF EXISTS job_data,
  DROP COLUMN IF EXISTS bull_job_id,
  DROP COLUMN IF EXISTS queue_name;
