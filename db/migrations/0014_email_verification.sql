-- 0014_email_verification.sql
-- 이메일 인증 컬럼 + 인증 코드 테이블

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

-- 기존 사용자는 인증된 것으로 처리
UPDATE users SET email_verified_at = created_at;

CREATE TABLE email_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_verifications_user_idx ON email_verifications (user_id);
