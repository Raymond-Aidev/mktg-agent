-- 0011_users.rollback.sql
REVOKE ALL ON users FROM batch_worker, signalcraft_worker;
DROP TABLE IF EXISTS users;
