-- 0012_products.rollback.sql
REVOKE ALL ON products, product_keywords FROM batch_worker, signalcraft_worker;
DROP TABLE IF EXISTS product_keywords;
DROP TABLE IF EXISTS products;
