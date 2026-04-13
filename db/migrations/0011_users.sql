-- 0011_users.sql
-- User accounts for authentication (Phase B).

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  email       CITEXT NOT NULL,
  password    TEXT NOT NULL,
  name        VARCHAR(200),
  role        VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_idx ON users (email);
CREATE INDEX users_tenant_idx ON users (tenant_id);

-- Grant access to both worker roles (read-only for user lookups).
GRANT SELECT ON users TO batch_worker, signalcraft_worker;
