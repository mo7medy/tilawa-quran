CREATE TABLE IF NOT EXISTS studio_publisher (
 id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL,
 token TEXT NOT NULL, revision TEXT NOT NULL, organization_id TEXT NOT NULL,
 channel_id TEXT NOT NULL, channel_name TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 activated_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS studio_publications (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL UNIQUE, owner TEXT NOT NULL,
 job_id TEXT NOT NULL, connection_revision TEXT NOT NULL,
 channel_id TEXT NOT NULL, organization_id TEXT NOT NULL, text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','pending','published','review','failed','unknown','cancelled')),
 post_id TEXT, external_url TEXT, error TEXT,
 lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0,
 media_until INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_publications_pending ON studio_publications(status,next_at,lease_until);
CREATE INDEX IF NOT EXISTS studio_publications_owner ON studio_publications(owner,created_at);
