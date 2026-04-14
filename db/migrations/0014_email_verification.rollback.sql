-- 0014_email_verification.rollback.sql
DROP TABLE IF EXISTS email_verifications;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
