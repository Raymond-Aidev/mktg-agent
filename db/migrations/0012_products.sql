-- 0012_products.sql
-- Product and keyword management tables (Phase C).

CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  name        VARCHAR(300) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_tenant_idx ON products (tenant_id, created_at DESC);

CREATE TABLE product_keywords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  keyword         VARCHAR(200) NOT NULL,
  search_volume   INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_keywords_product_idx ON product_keywords (product_id);
CREATE INDEX product_keywords_tenant_idx ON product_keywords (tenant_id);
CREATE UNIQUE INDEX product_keywords_unique_idx ON product_keywords (product_id, keyword);

GRANT SELECT, INSERT, UPDATE, DELETE ON products, product_keywords TO batch_worker;
GRANT SELECT ON products, product_keywords TO signalcraft_worker;
