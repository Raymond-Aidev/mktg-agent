-- 0005_llm_usage.sql
-- LLM API call ledger for cost aggregation and validation tracking.

CREATE TABLE llm_usage (
  id                          BIGSERIAL PRIMARY KEY,
  tenant_id                   UUID NOT NULL,
  job_id                      UUID,
  module_id                   VARCHAR(20),
    -- e.g. '#01', '#07', '#13' (SignalCraft modules) or 'research', 'translation'
  model_name                  VARCHAR(60) NOT NULL,
    -- e.g. 'claude-sonnet-4-6', 'gemini-2.5-flash'
  input_tokens                INTEGER NOT NULL DEFAULT 0,
  output_tokens               INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens         INTEGER NOT NULL DEFAULT 0,
  price_per_input_token       NUMERIC(18, 10) NOT NULL DEFAULT 0,
  price_per_output_token      NUMERIC(18, 10) NOT NULL DEFAULT 0,
  cost_usd                    NUMERIC(12, 6) GENERATED ALWAYS AS
    (input_tokens * price_per_input_token + output_tokens * price_per_output_token) STORED,
  latency_ms                  INTEGER,
  validation_failures         JSONB,
  called_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX llm_usage_tenant_time_idx ON llm_usage (tenant_id, called_at DESC);
CREATE INDEX llm_usage_model_time_idx  ON llm_usage (model_name, called_at DESC);
CREATE INDEX llm_usage_job_idx         ON llm_usage (job_id) WHERE job_id IS NOT NULL;
