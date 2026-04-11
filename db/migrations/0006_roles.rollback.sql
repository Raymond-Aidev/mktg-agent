-- 0006_roles.rollback.sql
-- Revoke and drop roles. This will fail if roles still own objects.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM batch_worker, signalcraft_worker;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM batch_worker, signalcraft_worker;
DROP ROLE IF EXISTS signalcraft_worker;
DROP ROLE IF EXISTS batch_worker;
