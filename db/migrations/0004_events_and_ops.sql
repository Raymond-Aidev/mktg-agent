-- 0004_events_and_ops.sql
-- User behavior events, email pipeline events, change log, crawler failures.

------------------------------------------------------------------
-- events — frontend + middleware instrumentation stream
------------------------------------------------------------------
CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  user_id     UUID,
  event_type  VARCHAR(60) NOT NULL,
    -- e.g. 'agent_output_accepted' | 'report_viewed' | 'signalcraft_started'
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_tenant_type_time_idx
  ON events (tenant_id, event_type, occurred_at DESC);
CREATE INDEX events_user_time_idx
  ON events (user_id, occurred_at DESC) WHERE user_id IS NOT NULL;

------------------------------------------------------------------
-- email_events — Resend / SendGrid webhook stream
------------------------------------------------------------------
CREATE TABLE email_events (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    UUID NOT NULL,
  campaign_id  UUID,
  buyer_id     UUID REFERENCES buyers(id) ON DELETE SET NULL,
  event_type   VARCHAR(30) NOT NULL,
    -- 'email.sent' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.replied'
  provider     VARCHAR(20) NOT NULL DEFAULT 'resend',
  occurred_at  TIMESTAMPTZ NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload  JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX email_events_tenant_type_time_idx
  ON email_events (tenant_id, event_type, occurred_at DESC);
CREATE INDEX email_events_campaign_idx
  ON email_events (campaign_id) WHERE campaign_id IS NOT NULL;

------------------------------------------------------------------
-- change_log — diff of master record changes (Category A only)
------------------------------------------------------------------
CREATE TABLE change_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  diff        JSONB NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX change_log_table_record_idx ON change_log (table_name, record_id, changed_at DESC);

------------------------------------------------------------------
-- crawler_failures — partial/full failure records for Category A
------------------------------------------------------------------
CREATE TABLE crawler_failures (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  target_url  TEXT,
  error_code  TEXT,
  error_msg   TEXT,
  attempt     SMALLINT NOT NULL DEFAULT 1,
  failed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX crawler_failures_source_time_idx
  ON crawler_failures (source, failed_at DESC);
