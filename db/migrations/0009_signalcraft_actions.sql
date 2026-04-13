-- 0009_signalcraft_actions.sql
-- Phase D: action outputs generated from SignalCraft analysis results.
-- Each action is linked to a job and produces marketing-ready content
-- (campaign drafts, content calendars, pitch deck outlines).

CREATE TABLE signalcraft_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  job_id       UUID REFERENCES signalcraft_jobs(id) ON DELETE SET NULL,
  action_type  VARCHAR(30) NOT NULL,
    -- 'campaign_draft' | 'content_calendar' | 'pitch_deck'
  input        JSONB NOT NULL DEFAULT '{}'::jsonb,
  output       JSONB,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'generating' | 'done' | 'failed'
  error_msg    TEXT,
  model_name   VARCHAR(60),
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX signalcraft_actions_tenant_idx
  ON signalcraft_actions (tenant_id, created_at DESC);
CREATE INDEX signalcraft_actions_job_idx
  ON signalcraft_actions (job_id) WHERE job_id IS NOT NULL;
