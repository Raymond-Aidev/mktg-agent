-- 0010_campaigns.sql
-- Email marketing campaigns master table.
-- Referenced by email_events.campaign_id (currently unlinked UUID).
-- This table is Category A (persistent dataset) — owned by batch_worker.

CREATE TABLE campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  name          VARCHAR(300) NOT NULL,
  subject       VARCHAR(500),
  status        VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'completed', 'cancelled')),
  target_count  INTEGER NOT NULL DEFAULT 0,
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_tenant_idx ON campaigns (tenant_id, created_at DESC);
CREATE INDEX campaigns_status_idx ON campaigns (status) WHERE status NOT IN ('completed', 'cancelled');

-- Add FK from email_events → campaigns (SET NULL on delete to avoid cascade).
ALTER TABLE email_events
  ADD CONSTRAINT email_events_campaign_fk
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

-- Grant permissions to existing roles (mirrors 0006_roles.sql pattern).
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO batch_worker;
GRANT SELECT ON campaigns TO signalcraft_worker;

-- Fix missing grants for tables created after 0006_roles.sql:
-- signalcraft_module_outputs and signalcraft_actions are Category B.
GRANT SELECT, INSERT, UPDATE, DELETE ON signalcraft_module_outputs TO signalcraft_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON signalcraft_actions TO signalcraft_worker;
