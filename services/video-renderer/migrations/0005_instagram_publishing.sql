-- Keep id=1 and the default platform for old deployments during rollout.
CREATE TABLE studio_publisher_next (
 id INTEGER PRIMARY KEY CHECK(id IN (1,2)),
 platform TEXT NOT NULL DEFAULT 'tiktok' UNIQUE CHECK(platform IN ('tiktok','instagram')),
 owner TEXT NOT NULL, token TEXT NOT NULL, revision TEXT NOT NULL,
 organization_id TEXT NOT NULL, channel_id TEXT NOT NULL, channel_name TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 activated_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 CHECK((id=1 AND platform='tiktok') OR (id=2 AND platform='instagram'))
);
INSERT INTO studio_publisher_next(id,owner,token,revision,organization_id,channel_id,channel_name,enabled,activated_at,updated_at)
 SELECT id,owner,token,revision,organization_id,channel_id,channel_name,enabled,activated_at,updated_at FROM studio_publisher;
DROP TABLE studio_publisher;
ALTER TABLE studio_publisher_next RENAME TO studio_publisher;

CREATE TABLE studio_publications_next (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL, owner TEXT NOT NULL,
 platform TEXT NOT NULL DEFAULT 'tiktok' CHECK(platform IN ('tiktok','instagram')),
 job_id TEXT NOT NULL, connection_revision TEXT NOT NULL,
 channel_id TEXT NOT NULL, organization_id TEXT NOT NULL, text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','pending','published','review','failed','unknown','cancelled')),
 post_id TEXT, external_url TEXT, error TEXT,
 lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0,
 media_until INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(run_id,platform)
);
INSERT INTO studio_publications_next(id,run_id,owner,job_id,connection_revision,channel_id,organization_id,text,status,post_id,external_url,error,lease,lease_until,attempts,next_at,media_until,created_at,updated_at)
 SELECT id,run_id,owner,job_id,connection_revision,channel_id,organization_id,text,status,post_id,external_url,error,lease,lease_until,attempts,next_at,media_until,created_at,updated_at FROM studio_publications;
DROP TABLE studio_publications;
ALTER TABLE studio_publications_next RENAME TO studio_publications;
CREATE INDEX studio_publications_pending ON studio_publications(status,next_at,lease_until);
CREATE INDEX studio_publications_owner ON studio_publications(owner,platform,created_at);
