PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS studio_projects (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, registered INTEGER NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1, spec TEXT NOT NULL, updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_projects_owner ON studio_projects(owner, expires_at);
CREATE TABLE IF NOT EXISTS studio_assets (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, registered INTEGER NOT NULL, object_key TEXT NOT NULL UNIQUE,
 size INTEGER NOT NULL CHECK(size > 0), mime TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 metadata TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_assets_owner ON studio_assets(owner, expires_at);
CREATE TABLE IF NOT EXISTS studio_jobs (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, project_id TEXT NOT NULL, revision INTEGER NOT NULL,
 day TEXT NOT NULL, daily_limit INTEGER NOT NULL, duration_ms INTEGER NOT NULL CHECK(duration_ms > 0),
 storage_limit INTEGER NOT NULL, output_reserved INTEGER NOT NULL,
 manifest TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', progress INTEGER NOT NULL DEFAULT 0,
 attempt INTEGER NOT NULL DEFAULT 1, charged INTEGER NOT NULL DEFAULT 0, idempotency TEXT NOT NULL,
 lease_until INTEGER NOT NULL DEFAULT 0, dispatch_at INTEGER NOT NULL DEFAULT 0, call_id TEXT,
 error TEXT, output_key TEXT, output_size INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 UNIQUE(owner, idempotency)
);
CREATE INDEX IF NOT EXISTS studio_jobs_owner ON studio_jobs(owner, day);
CREATE INDEX IF NOT EXISTS studio_jobs_state ON studio_jobs(status, lease_until);
CREATE TABLE IF NOT EXISTS studio_rates (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS studio_job_quota BEFORE INSERT ON studio_jobs BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_jobs WHERE owner=NEW.owner AND status IN ('queued','preparing','rendering','uploading','cancel_requested')) >= 1 THEN RAISE(ABORT,'OWNER_BUSY') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM studio_jobs WHERE owner=NEW.owner AND day=NEW.day AND (charged=1 OR status IN ('queued','preparing','rendering','uploading','completed','cancel_requested'))) >= NEW.daily_limit THEN RAISE(ABORT,'DAILY_LIMIT') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(duration_ms) FROM studio_jobs WHERE day=NEW.day AND (charged=1 OR status IN ('queued','preparing','rendering','uploading','completed','cancel_requested'))),0)+NEW.duration_ms > 3600000 THEN RAISE(ABORT,'GLOBAL_LIMIT') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(size) FROM studio_assets WHERE owner=NEW.owner AND expires_at>NEW.created_at AND status!='failed'),0)+COALESCE((SELECT SUM(CASE WHEN status IN ('queued','preparing','rendering','uploading','cancel_requested') THEN output_reserved ELSE output_size END) FROM studio_jobs WHERE owner=NEW.owner AND expires_at>NEW.created_at),0)+NEW.output_reserved>NEW.storage_limit THEN RAISE(ABORT,'STORAGE_LIMIT') END;
END;
