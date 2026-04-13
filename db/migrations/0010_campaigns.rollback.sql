-- 0010_campaigns.rollback.sql
ALTER TABLE email_events DROP CONSTRAINT IF EXISTS email_events_campaign_fk;
REVOKE ALL ON campaigns FROM batch_worker, signalcraft_worker;
DROP TABLE IF EXISTS campaigns;

-- Revert grants added for post-0006 tables.
REVOKE ALL ON signalcraft_module_outputs FROM signalcraft_worker;
REVOKE ALL ON signalcraft_actions FROM signalcraft_worker;
