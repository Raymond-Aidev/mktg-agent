-- 0002_master_tables.sql
-- Category A (persistent dataset) master tables.
-- All master tables share the common contract defined in
-- docs/Technical_Specification_v1.0.md §1.2.4:
--   source_uid TEXT UNIQUE    — natural key from the source
--   fingerprint TEXT          — md5/sha of core fields for change detection
--   last_seen_at TIMESTAMPTZ  — most recent successful observation
--   updated_at TIMESTAMPTZ    — when a field change was actually detected
--   is_stale BOOLEAN          — true when last_seen_at is older than 7 days

------------------------------------------------------------------
-- 1. buyers — Bologna Book Fair directory + other publishers
------------------------------------------------------------------
CREATE TABLE buyers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid      TEXT NOT NULL,
  tenant_id       UUID,
  company_name    VARCHAR(300) NOT NULL,
  country         VARCHAR(100),
  city            VARCHAR(100),
  contact_name    VARCHAR(200),
  contact_email   CITEXT,
  genres          TEXT[] NOT NULL DEFAULT '{}',
  languages       TEXT[] NOT NULL DEFAULT '{}',
  deal_history    JSONB NOT NULL DEFAULT '{}'::jsonb,
  booth_number    VARCHAR(50),
  lead_score      NUMERIC(5, 2),
  last_contacted  DATE,
  source_url      TEXT,
  fingerprint     TEXT NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_stale        BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX buyers_source_uid_idx ON buyers (source_uid);
CREATE INDEX buyers_country_score_idx ON buyers (country, lead_score DESC);
CREATE INDEX buyers_tenant_idx ON buyers (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX buyers_genres_gin ON buyers USING GIN (genres);

------------------------------------------------------------------
-- 2. competitors — rival publishers tracked for monitoring
------------------------------------------------------------------
CREATE TABLE competitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid      TEXT NOT NULL,
  name            VARCHAR(300) NOT NULL,
  country         VARCHAR(100),
  website         TEXT,
  primary_genres  TEXT[] NOT NULL DEFAULT '{}',
  recent_titles   JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes           TEXT,
  fingerprint     TEXT NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_stale        BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX competitors_source_uid_idx ON competitors (source_uid);
CREATE INDEX competitors_country_idx ON competitors (country);

------------------------------------------------------------------
-- 3. market_trends — Google Trends / Statista / IBISWorld signals
------------------------------------------------------------------
CREATE TABLE market_trends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid      TEXT NOT NULL,
  topic           VARCHAR(300) NOT NULL,
  region          VARCHAR(50),
  score           NUMERIC(6, 2),
  source          VARCHAR(40) NOT NULL,
  observed_at     DATE NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  fingerprint     TEXT NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_stale        BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX market_trends_source_uid_idx ON market_trends (source_uid);
CREATE INDEX market_trends_topic_date_idx ON market_trends (topic, observed_at DESC);

------------------------------------------------------------------
-- 4. fx_rates — hourly currency pair snapshots
------------------------------------------------------------------
CREATE TABLE fx_rates (
  base         CHAR(3) NOT NULL,
  quote        CHAR(3) NOT NULL,
  rate         NUMERIC(18, 8) NOT NULL,
  observed_at  TIMESTAMPTZ NOT NULL,
  source       TEXT NOT NULL,
  PRIMARY KEY (base, quote, observed_at)
);
CREATE INDEX fx_rates_latest_idx ON fx_rates (base, quote, observed_at DESC);

------------------------------------------------------------------
-- 5. rights_deals — ISBN / rights transaction history
------------------------------------------------------------------
CREATE TABLE rights_deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid      TEXT NOT NULL,
  title           VARCHAR(500) NOT NULL,
  isbn            VARCHAR(20),
  author          VARCHAR(300),
  original_lang   VARCHAR(20),
  target_lang     VARCHAR(20),
  licensor        VARCHAR(300),
  licensee        VARCHAR(300),
  deal_date       DATE,
  territory       VARCHAR(100),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  fingerprint     TEXT NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_stale        BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX rights_deals_source_uid_idx ON rights_deals (source_uid);
CREATE INDEX rights_deals_title_idx ON rights_deals (title);
CREATE INDEX rights_deals_date_idx ON rights_deals (deal_date DESC);

------------------------------------------------------------------
-- 6. bestsellers — regional rankings (Amazon BSR / Kyobo etc.)
------------------------------------------------------------------
CREATE TABLE bestsellers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid      TEXT NOT NULL,
  region          VARCHAR(20) NOT NULL,
  category        VARCHAR(200) NOT NULL,
  rank            INTEGER NOT NULL,
  title           VARCHAR(500) NOT NULL,
  author          VARCHAR(300),
  isbn            VARCHAR(20),
  price_usd       NUMERIC(10, 2),
  observed_at     DATE NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  fingerprint     TEXT NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_stale        BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX bestsellers_source_uid_idx ON bestsellers (source_uid);
CREATE INDEX bestsellers_region_cat_rank_idx ON bestsellers (region, category, rank, observed_at DESC);
