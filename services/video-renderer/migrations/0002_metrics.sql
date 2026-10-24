ALTER TABLE studio_jobs ADD COLUMN started_at INTEGER;
ALTER TABLE studio_jobs ADD COLUMN render_started_at INTEGER;
ALTER TABLE studio_jobs ADD COLUMN finished_at INTEGER;
CREATE INDEX studio_jobs_retention ON studio_jobs(expires_at, day);
CREATE INDEX studio_assets_retention ON studio_assets(expires_at, status);
