-- 0015_keyword_snapshots.sql
-- 시계열 키워드 분석 스냅샷 테이블 + product_keywords 보강

-- 1) product_keywords에 자동 분석 설정 컬럼 추가
ALTER TABLE product_keywords
  ADD COLUMN IF NOT EXISTS auto_analyze BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS analyze_hour SMALLINT NOT NULL DEFAULT 6;

-- 2) keyword_snapshots: 1키워드 1일 1행
CREATE TABLE IF NOT EXISTS keyword_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_keyword_id   UUID NOT NULL REFERENCES product_keywords(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL,
  keyword              VARCHAR(200) NOT NULL,
  snapshot_date        DATE NOT NULL,
  job_id               UUID REFERENCES signalcraft_jobs(id) ON DELETE SET NULL,

  -- 핵심 수치 (시계열 차트용)
  post_count           INT NOT NULL DEFAULT 0,
  sentiment_positive   NUMERIC(5,4) DEFAULT 0,
  sentiment_negative   NUMERIC(5,4) DEFAULT 0,
  sentiment_neutral    NUMERIC(5,4) DEFAULT 0,
  sov_share            NUMERIC(5,4) DEFAULT 0,
  sov_rank             SMALLINT DEFAULT 0,
  mention_count        INT NOT NULL DEFAULT 0,
  risk_count           SMALLINT NOT NULL DEFAULT 0,

  -- 전체 모듈 출력 (상세 드릴다운용)
  module_outputs       JSONB,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_keyword_snapshot_date UNIQUE (product_keyword_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_ks_tenant_keyword_date
  ON keyword_snapshots (tenant_id, keyword, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_ks_snapshot_date
  ON keyword_snapshots (snapshot_date);

-- 3) signalcraft_worker 롤에 keyword_snapshots 권한 부여
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'signalcraft_worker') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_snapshots TO signalcraft_worker;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'batch_worker') THEN
    GRANT SELECT ON keyword_snapshots TO batch_worker;
    GRANT SELECT ON product_keywords TO batch_worker;
    GRANT SELECT ON products TO batch_worker;
  END IF;
END $$;
