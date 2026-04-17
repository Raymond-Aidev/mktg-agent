-- 0016_dlq_circuit_breaker.sql
-- Phase 7 W22 — DLQ + Circuit Breaker persistence layer.
--
-- 1) crawler_failures를 확장해 DLQ 식별자(원본 BullMQ jobId, 큐, 페이로드)와
--    영구 실패 여부(is_terminal)를 기록한다. 기존 컬럼은 그대로 유지.
-- 2) circuit_breaker_state 테이블을 신규 생성. source(잡 이름) 단위로
--    consecutive_failures, state(closed/open/half_open), open_until을
--    추적한다. 워커는 핸들러 진입 전 이 테이블을 조회해 open이면 즉시 skip.
-- 3) signalcraft_worker는 source 정보가 있어 부분 검사도 가능하지만
--    카테고리 B는 키워드 단위 실패라 별도 row를 갖지 않는다 → batch_worker
--    전용 RW, signalcraft_worker는 SELECT only.

-- ────────────────────────────────────────────────────────────────────
-- 1) crawler_failures 확장 (기존 row 호환)
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE crawler_failures
  ADD COLUMN IF NOT EXISTS queue_name   TEXT,
  ADD COLUMN IF NOT EXISTS bull_job_id  TEXT,
  ADD COLUMN IF NOT EXISTS job_data     JSONB,
  ADD COLUMN IF NOT EXISTS is_terminal  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS crawler_failures_terminal_idx
  ON crawler_failures (is_terminal, failed_at DESC)
  WHERE is_terminal = true AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS crawler_failures_bull_job_idx
  ON crawler_failures (bull_job_id)
  WHERE bull_job_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- 2) circuit_breaker_state — source 단위 회로 차단 상태
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  source                  TEXT PRIMARY KEY,
  state                   TEXT NOT NULL DEFAULT 'closed'
    CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures    INT NOT NULL DEFAULT 0,
  last_failure_at         TIMESTAMPTZ,
  last_success_at         TIMESTAMPTZ,
  opened_at               TIMESTAMPTZ,
  open_until              TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circuit_breaker_state_open_idx
  ON circuit_breaker_state (state, open_until)
  WHERE state = 'open';

-- ────────────────────────────────────────────────────────────────────
-- 3) Role grants
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'batch_worker') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON circuit_breaker_state TO batch_worker;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'signalcraft_worker') THEN
    GRANT SELECT ON circuit_breaker_state TO signalcraft_worker;
  END IF;
END $$;
