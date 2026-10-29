-- Additive rollout: legacy queues remain untouched until the explicit cutover.
CREATE TABLE studio_multi_control (
 id INTEGER PRIMARY KEY CHECK(id=1), active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
 maintenance INTEGER NOT NULL DEFAULT 0 CHECK(maintenance IN (0,1)),
 mode TEXT NOT NULL DEFAULT 'independent' CHECK(mode IN ('independent','shared')),
 next_mode TEXT NOT NULL DEFAULT 'independent' CHECK(next_mode IN ('independent','shared')),
 effective_day TEXT NOT NULL DEFAULT '', cutover_day TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL DEFAULT 0,
 migration_lease TEXT, migration_until INTEGER NOT NULL DEFAULT 0, migration_attempt INTEGER NOT NULL DEFAULT 0,
 migration_error TEXT
);
INSERT INTO studio_multi_control(id) VALUES(1);
CREATE TABLE studio_buffer_connections (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL,
 token TEXT NOT NULL, revision TEXT NOT NULL, disconnected INTEGER NOT NULL DEFAULT 0 CHECK(disconnected IN (0,1)),
 cooldown_until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(owner,account_id)
);
CREATE TABLE studio_destinations (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, connection_id TEXT NOT NULL REFERENCES studio_buffer_connections(id),
 platform TEXT NOT NULL CHECK(platform IN ('tiktok','instagram')), organization_id TEXT NOT NULL,
 channel_id TEXT NOT NULL, name TEXT NOT NULL, eligible INTEGER NOT NULL DEFAULT 0 CHECK(eligible IN (0,1)),
 daily_count INTEGER NOT NULL DEFAULT 0 CHECK(daily_count BETWEEN 0 AND 3),
 next_count INTEGER NOT NULL DEFAULT 0 CHECK(next_count BETWEEN 0 AND 3),
 effective_day TEXT NOT NULL, paused INTEGER NOT NULL DEFAULT 1 CHECK(paused IN (0,1)),
 disconnected INTEGER NOT NULL DEFAULT 0 CHECK(disconnected IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1, last_sent_at INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(owner,platform,channel_id)
);
CREATE INDEX studio_destinations_connection ON studio_destinations(connection_id);
CREATE TABLE studio_automation_days (
 owner TEXT NOT NULL, day TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('independent','shared')),
 created_at INTEGER NOT NULL, PRIMARY KEY(owner,day)
);
CREATE TABLE studio_day_destinations (
 owner TEXT NOT NULL, day TEXT NOT NULL, destination_id TEXT NOT NULL,
 daily_count INTEGER NOT NULL CHECK(daily_count BETWEEN 0 AND 3),
 revision INTEGER NOT NULL, PRIMARY KEY(owner,day,destination_id)
);
CREATE TABLE studio_automation_tasks (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, day TEXT NOT NULL, slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 2),
 stream_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','planning','ready','submitted','completed','skipped','failed')),
 attempt INTEGER NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 next_at INTEGER NOT NULL DEFAULT 0, plan TEXT, project_id TEXT, job_id TEXT, error TEXT,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(owner,day,stream_key,slot)
);
CREATE INDEX studio_tasks_pending ON studio_automation_tasks(owner,day,status,next_at,lease_until);
CREATE TABLE studio_task_destinations (
 task_id TEXT NOT NULL, destination_id TEXT NOT NULL, revision INTEGER NOT NULL,
 PRIMARY KEY(task_id,destination_id), UNIQUE(destination_id,task_id)
);
CREATE TABLE studio_deliveries (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL, destination_id TEXT NOT NULL, owner TEXT NOT NULL,
 platform TEXT NOT NULL CHECK(platform IN ('tiktok','instagram')), job_id TEXT NOT NULL,
 connection_id TEXT NOT NULL, connection_revision TEXT NOT NULL,
 channel_id TEXT NOT NULL, organization_id TEXT NOT NULL, text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','pending','published','review','failed','unknown','cancelled')),
 post_id TEXT, external_url TEXT, error TEXT, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0,
 media_until INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(run_id,destination_id)
);
CREATE INDEX studio_deliveries_pending ON studio_deliveries(status,next_at,lease_until);
CREATE INDEX studio_deliveries_owner ON studio_deliveries(owner,destination_id,created_at);
CREATE TABLE studio_multi_ai_budget (
 day TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0 CHECK(calls BETWEEN 0 AND 60)
);
CREATE TABLE studio_buffer_usage (
 connection_id TEXT NOT NULL, day TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(connection_id,day)
);
CREATE TABLE studio_buffer_channels (
 connection_id TEXT PRIMARY KEY, revision TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TRIGGER studio_connection_limit BEFORE INSERT ON studio_buffer_connections WHEN NEW.disconnected=0 BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_buffer_connections WHERE owner=NEW.owner AND disconnected=0)>=3 THEN RAISE(ABORT,'CONNECTION_LIMIT') END;
END;
CREATE TRIGGER studio_connection_reconnect_limit BEFORE UPDATE OF disconnected ON studio_buffer_connections WHEN NEW.disconnected=0 AND OLD.disconnected=1 BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_buffer_connections WHERE owner=NEW.owner AND disconnected=0)>=3 THEN RAISE(ABORT,'CONNECTION_LIMIT') END;
END;
CREATE TRIGGER studio_destination_limit BEFORE INSERT ON studio_destinations WHEN NEW.disconnected=0 BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_destinations WHERE owner=NEW.owner AND disconnected=0)>=9 THEN RAISE(ABORT,'DESTINATION_LIMIT') END;
END;
CREATE TRIGGER studio_destination_reconnect_limit BEFORE UPDATE OF disconnected ON studio_destinations WHEN NEW.disconnected=0 AND OLD.disconnected=1 BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_destinations WHERE owner=NEW.owner AND disconnected=0)>=9 THEN RAISE(ABORT,'DESTINATION_LIMIT') END;
END;
CREATE TABLE studio_studio_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, owner TEXT NOT NULL, action TEXT NOT NULL,
 subject TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX studio_audit_owner ON studio_studio_audit(owner,created_at);
ALTER TABLE studio_jobs ADD COLUMN quota_class TEXT NOT NULL DEFAULT 'manual' CHECK(quota_class IN ('manual','automation'));
DROP TRIGGER studio_job_quota;
CREATE TRIGGER studio_job_quota BEFORE INSERT ON studio_jobs BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_jobs WHERE owner=NEW.owner AND status IN ('queued','preparing','rendering','uploading','cancel_requested')) >= 1 THEN RAISE(ABORT,'OWNER_BUSY') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_jobs WHERE owner=NEW.owner AND quota_class=NEW.quota_class AND day=NEW.day AND (charged=1 OR status IN ('queued','preparing','rendering','uploading','completed','cancel_requested'))) >= NEW.daily_limit THEN RAISE(ABORT,'DAILY_LIMIT') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(duration_ms) FROM studio_jobs WHERE day=NEW.day AND (charged=1 OR status IN ('queued','preparing','rendering','uploading','completed','cancel_requested'))),0)+NEW.duration_ms > 3600000 THEN RAISE(ABORT,'GLOBAL_LIMIT') END;
 SELECT CASE WHEN (CASE WHEN NEW.quota_class='manual' THEN COALESCE((SELECT SUM(size) FROM studio_assets WHERE owner=NEW.owner AND expires_at>NEW.created_at AND status!='failed'),0) ELSE 0 END)+COALESCE((SELECT SUM(CASE WHEN status IN ('queued','preparing','rendering','uploading','cancel_requested') THEN output_reserved ELSE output_size END) FROM studio_jobs WHERE owner=NEW.owner AND quota_class=NEW.quota_class AND expires_at>NEW.created_at),0)+NEW.output_reserved>NEW.storage_limit THEN RAISE(ABORT,'STORAGE_LIMIT') END;
END;
