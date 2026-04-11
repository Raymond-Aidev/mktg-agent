-- 0001_extensions.sql
-- Enable required PostgreSQL extensions.
-- pgcrypto: gen_random_uuid() for UUID primary keys
-- citext: case-insensitive text for emails/source_uids

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
