-- Expand per-destination counts without changing existing IDs, slots, plans or delivery history.
CREATE TABLE studio_destinations_v2 (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, connection_id TEXT NOT NULL REFERENCES studio_buffer_connections(id),
 platform TEXT NOT NULL CHECK(platform IN ('tiktok','instagram')), organization_id TEXT NOT NULL,
 channel_id TEXT NOT NULL, name TEXT NOT NULL, eligible INTEGER NOT NULL DEFAULT 0 CHECK(eligible IN (0,1)),
 daily_count INTEGER NOT NULL DEFAULT 0 CHECK(daily_count BETWEEN 0 AND 4),
 next_count INTEGER NOT NULL DEFAULT 0 CHECK(next_count BETWEEN 0 AND 4),
 effective_day TEXT NOT NULL, paused INTEGER NOT NULL DEFAULT 1 CHECK(paused IN (0,1)),
 disconnected INTEGER NOT NULL DEFAULT 0 CHECK(disconnected IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1, last_sent_at INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(owner,platform,channel_id)
);
INSERT INTO studio_destinations_v2 SELECT * FROM studio_destinations;
DROP TABLE studio_destinations;
ALTER TABLE studio_destinations_v2 RENAME TO studio_destinations;
CREATE TABLE studio_day_destinations_v2 (
 owner TEXT NOT NULL, day TEXT NOT NULL, destination_id TEXT NOT NULL,
 daily_count INTEGER NOT NULL CHECK(daily_count BETWEEN 0 AND 4),
 revision INTEGER NOT NULL, PRIMARY KEY(owner,day,destination_id)
);
INSERT INTO studio_day_destinations_v2 SELECT * FROM studio_day_destinations;
DROP TABLE studio_day_destinations;
ALTER TABLE studio_day_destinations_v2 RENAME TO studio_day_destinations;
CREATE TABLE studio_automation_tasks_v2 (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, day TEXT NOT NULL, slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 3),
 stream_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','planning','ready','submitted','completed','skipped','failed')),
 attempt INTEGER NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 next_at INTEGER NOT NULL DEFAULT 0, plan TEXT, project_id TEXT, job_id TEXT, error TEXT,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(owner,day,stream_key,slot)
);
INSERT INTO studio_automation_tasks_v2 SELECT * FROM studio_automation_tasks;
DROP TABLE studio_automation_tasks;
ALTER TABLE studio_automation_tasks_v2 RENAME TO studio_automation_tasks;
CREATE INDEX studio_destinations_connection ON studio_destinations(connection_id);
CREATE INDEX studio_tasks_pending ON studio_automation_tasks(owner,day,status,next_at,lease_until);
CREATE TRIGGER studio_destination_limit BEFORE INSERT ON studio_destinations WHEN NEW.disconnected=0 BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_destinations WHERE owner=NEW.owner AND disconnected=0)>=9 THEN RAISE(ABORT,'DESTINATION_LIMIT') END;
END;
CREATE TRIGGER studio_destination_reconnect_limit BEFORE UPDATE OF disconnected ON studio_destinations WHEN NEW.disconnected=0 AND OLD.disconnected=1 BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_destinations WHERE owner=NEW.owner AND disconnected=0)>=9 THEN RAISE(ABORT,'DESTINATION_LIMIT') END;
END;
