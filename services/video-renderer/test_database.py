"""Exercise real SQLite constraints with independent concurrent connections (D1 SQL dialect)."""
import concurrent.futures
from contextlib import contextmanager
from pathlib import Path
import sqlite3
import tempfile
import unittest

MIGRATION = Path(__file__).parent / "migrations/0001_studio.sql"


class QuotaTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = str(Path(self.directory.name) / "studio.sqlite")
        with self.connect() as db:
            for migration in sorted(MIGRATION.parent.glob("*.sql")):
                db.executescript(migration.read_text(encoding="utf-8"))

    def tearDown(self):
        self.directory.cleanup()

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def insert(self, key, owner="guest:1", duration=1000, day="2026-10-24", limit=2, reservation=1000):
        try:
            with self.connect() as db:
                db.execute("INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved) VALUES(?,?,?,1,?,?,?,'{}',?,1,9999999999999,104857600,?)", (key, owner, "project", day, limit, duration, key, reservation))
            return "ok"
        except sqlite3.IntegrityError as error:
            return str(error)

    def complete(self, key):
        with self.connect() as db:
            db.execute("UPDATE studio_jobs SET status='completed',charged=1 WHERE id=?", (key,))

    def test_one_active_job_survives_racing_requests(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(lambda i: self.insert(str(i)), range(12)))
        self.assertEqual(results.count("ok"), 1)
        self.assertEqual(results.count("OWNER_BUSY"), 11)

    def test_daily_quota_and_project_deletion_cannot_reset_it(self):
        self.assertEqual(self.insert("one"), "ok")
        self.complete("one")
        self.assertEqual(self.insert("two"), "ok")
        self.complete("two")
        with self.connect() as db:
            db.execute("UPDATE studio_jobs SET status='expired',manifest='{}',output_key=NULL,output_size=0 WHERE project_id='project'")
        self.assertEqual(self.insert("three"), "DAILY_LIMIT")
        self.assertEqual(self.insert("tomorrow", day="2026-10-25"), "ok")

    def test_service_failure_refunds_but_started_cancellation_counts(self):
        self.insert("one")
        with self.connect() as db:
            db.execute("UPDATE studio_jobs SET status='failed',charged=0 WHERE id='one'")
        self.assertEqual(self.insert("two"), "ok")
        with self.connect() as db:
            db.execute("UPDATE studio_jobs SET status='cancelled',charged=1 WHERE id='two'")
        self.assertEqual(self.insert("three"), "ok")
        self.complete("three")
        self.assertEqual(self.insert("four"), "DAILY_LIMIT")

    def test_global_budget_is_atomic_across_owners(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda i: self.insert(str(i), owner=f"user:{i}", duration=180000, limit=10), range(24)))
        self.assertEqual(results.count("ok"), 20)
        self.assertEqual(results.count("GLOBAL_LIMIT"), 4)

    def test_shared_storage_includes_uploaded_and_reserved_bytes(self):
        with self.connect() as db:
            db.execute("INSERT INTO studio_assets(id,owner,registered,object_key,size,mime,status,created_at,expires_at) VALUES('asset','guest:1',0,'uploads/asset',104857000,'image/png','ready',1,9999999999999)")
        self.assertEqual(self.insert("one", reservation=1000), "STORAGE_LIMIT")
        with self.connect() as db:
            db.execute("UPDATE studio_assets SET expires_at=0")
        self.assertEqual(self.insert("one", reservation=1000), "ok")

    def test_concurrent_execution_claims_never_exceed_two(self):
        for i in range(5):
            self.insert(str(i), owner=f"user:{i}")

        def claim(key):
            with self.connect() as db:
                result = db.execute("UPDATE studio_jobs SET status='preparing',lease_until=100 WHERE id=? AND status='queued' AND (SELECT COUNT(*) FROM studio_jobs WHERE status IN ('preparing','rendering','uploading','cancel_requested') AND lease_until>1)<2 RETURNING id", (str(key),)).fetchone()
                return result is not None

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            self.assertEqual(sum(pool.map(claim, range(5))), 2)

    def test_automation_has_separate_daily_and_storage_quotas(self):
        with self.connect() as db:
            for index in range(30):
                db.execute("INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved,output_size,status,quota_class) VALUES(?,'user:automation','project',1,'2026-10-29',30,30000,'{}',?,1,9999999999999,10737418240,1000,2000000,'completed','automation')", (f"auto-{index}", f"auto-{index}"))
            with self.assertRaisesRegex(sqlite3.IntegrityError, "DAILY_LIMIT"):
                db.execute("INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved,quota_class) VALUES('auto-over','user:automation','project',1,'2026-10-29',30,30000,'{}','auto-over',1,9999999999999,10737418240,1000,'automation')")
            db.execute("UPDATE studio_jobs SET output_size=1000000000 WHERE id='auto-0'")
            db.execute("INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved,quota_class) VALUES('manual','user:automation','project',1,'2026-10-29',10,30000,'{}','manual',1,9999999999999,1073741824,1000,'manual')")
            self.assertEqual(db.execute("SELECT COUNT(*) FROM studio_jobs WHERE quota_class='manual'").fetchone()[0], 1)

    def test_connection_limit_survives_concurrent_inserts(self):
        def connect_account(index):
            try:
                with self.connect() as db:
                    db.execute("INSERT INTO studio_buffer_connections(id,owner,account_id,name,token,revision,created_at,updated_at) VALUES(?,'user:owner',?,'Buffer','ciphertext','revision',1,1)", (str(index), str(index)))
                return "ok"
            except sqlite3.IntegrityError as error:
                return str(error)
        with concurrent.futures.ThreadPoolExecutor(max_workers=9) as pool:
            results = list(pool.map(connect_account, range(9)))
        self.assertEqual(results.count("ok"), 3)
        self.assertEqual(results.count("CONNECTION_LIMIT"), 6)


if __name__ == "__main__":
    unittest.main()
