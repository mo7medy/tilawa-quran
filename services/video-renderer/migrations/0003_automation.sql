CREATE TABLE IF NOT EXISTS studio_automation_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 optional_third INTEGER NOT NULL DEFAULT 1 CHECK(optional_third IN (0,1)),
 updated_at INTEGER NOT NULL, activated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS studio_automation_runs (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, day TEXT NOT NULL,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 2),
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','planning','ready','submitted','completed','skipped','failed')),
 attempt INTEGER NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 next_at INTEGER NOT NULL DEFAULT 0, plan TEXT, project_id TEXT, job_id TEXT,
 error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(day,slot)
);
CREATE INDEX IF NOT EXISTS studio_automation_pending ON studio_automation_runs(status,next_at,lease_until);
CREATE INDEX IF NOT EXISTS studio_automation_owner ON studio_automation_runs(owner,created_at);
CREATE TABLE IF NOT EXISTS studio_automation_ai_budget (
 day TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0 CHECK(calls BETWEEN 0 AND 12)
);
CREATE TABLE IF NOT EXISTS studio_automation_cache (
 key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL
);
