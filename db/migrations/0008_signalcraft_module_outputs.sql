-- 0008_signalcraft_module_outputs.sql
-- Per-module analysis output for SignalCraft Stage 3.
--
-- One row per (job_id, module_id). #13 Integrated reads all sibling rows
-- for its job to compose the final report. Failed rows are kept (with
-- status='failed' + error_msg) so the dashboard can show which modules
-- degraded a particular run.

CREATE TABLE signalcraft_module_outputs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES signalcraft_jobs(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  module_id   VARCHAR(20) NOT NULL,
  status      VARCHAR(20) NOT NULL,
    -- 'success' | 'failed' | 'skipped'
  output      JSONB,
  error_msg   TEXT,
  attempts    SMALLINT NOT NULL DEFAULT 1,
  duration_ms INTEGER,
  model_name  VARCHAR(60),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX signalcraft_module_outputs_job_module_idx
  ON signalcraft_module_outputs (job_id, module_id);

CREATE INDEX signalcraft_module_outputs_tenant_idx
  ON signalcraft_module_outputs (tenant_id, created_at DESC);
