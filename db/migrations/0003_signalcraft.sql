-- 0003_signalcraft.sql
-- Category B (on-demand keyword dataset) tables.
-- See docs/Technical_Specification_v1.0.md §1.3.

------------------------------------------------------------------
-- signalcraft_jobs — tracks the lifecycle of one SignalCraft run
------------------------------------------------------------------
CREATE TABLE signalcraft_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  keyword           VARCHAR(200) NOT NULL,
  regions           TEXT[] NOT NULL DEFAULT '{}',
  modules_requested TEXT[] NOT NULL DEFAULT '{}',
  status            VARCHAR(20) NOT NULL DEFAULT 'queued',
    -- 'queued' | 'collecting' | 'analyzing' | 'rendering' | 'done' | 'failed'
  current_stage     VARCHAR(40),
  progress_pct      SMALLINT NOT NULL DEFAULT 0,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  finished_at       TIMESTAMPTZ
);
CREATE INDEX signalcraft_jobs_tenant_created_idx
  ON signalcraft_jobs (tenant_id, created_at DESC);
CREATE INDEX signalcraft_jobs_status_idx
  ON signalcraft_jobs (status) WHERE status IN ('queued', 'collecting', 'analyzing');

------------------------------------------------------------------
-- raw_posts — normalized output from the 5 collectors
------------------------------------------------------------------
CREATE TABLE raw_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES signalcraft_jobs(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  source       VARCHAR(20) NOT NULL,
    -- 'naver_news' | 'naver_comment' | 'youtube' | 'dc' | 'clien' | 'fmkorea'
  keyword      VARCHAR(200) NOT NULL,
  post_id      VARCHAR(200),
  author       VARCHAR(200),
  content      TEXT NOT NULL,
  likes        INTEGER NOT NULL DEFAULT 0,
  dislikes     INTEGER NOT NULL DEFAULT 0,
  comments_cnt INTEGER NOT NULL DEFAULT 0,
  view_cnt     INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  url          TEXT
);
CREATE INDEX raw_posts_job_idx ON raw_posts (job_id);
CREATE INDEX raw_posts_tenant_collected_idx ON raw_posts (tenant_id, collected_at DESC);
CREATE INDEX raw_posts_source_keyword_idx ON raw_posts (source, keyword);

------------------------------------------------------------------
-- reports — persisted SignalCraft / Research / Translation reports
------------------------------------------------------------------
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  job_id       UUID REFERENCES signalcraft_jobs(id) ON DELETE SET NULL,
  kind         VARCHAR(30) NOT NULL,
    -- 'signalcraft_integrated' | 'market_trends' | 'translation_qa'
  title        TEXT NOT NULL,
  sections     JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_s3_key   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_tenant_created_idx ON reports (tenant_id, created_at DESC);
CREATE INDEX reports_kind_idx ON reports (kind);
