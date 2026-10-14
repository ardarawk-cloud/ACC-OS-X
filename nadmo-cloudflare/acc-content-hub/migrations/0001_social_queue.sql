-- NADMO SOCIAL: private owner-operated TikTok shared queue v1
-- Apply to dedicated D1 only after staging verification.
CREATE TABLE IF NOT EXISTS social_jobs (
  id TEXT PRIMARY KEY,
  submission_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  channel_key TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_account TEXT NOT NULL DEFAULT 'TIKTOK_SHARED_01' CHECK (target_account = 'TIKTOK_SHARED_01'),
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video','image')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','URGENT','OWNER_PINNED')),
  status TEXT NOT NULL CHECK (status IN ('UNASSIGNED','QC_PENDING','QC_BLOCKED','READY','SCHEDULED','SHARE_OPENED','SELF_REPORTED','PUBLISHED_VERIFIED','PAUSED','CANCELLED','MISSED')),
  scheduled_date TEXT,
  scheduled_time TEXT,
  published_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  verified_at TEXT,
  CHECK ((scheduled_date IS NULL AND scheduled_time IS NULL) OR
         (scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_social_jobs_day ON social_jobs(scheduled_date,scheduled_time);
CREATE INDEX IF NOT EXISTS idx_social_jobs_status ON social_jobs(status,priority,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_slot ON social_jobs(target_account,scheduled_date,scheduled_time)
  WHERE scheduled_date IS NOT NULL AND status NOT IN ('CANCELLED','QC_BLOCKED','MISSED');
CREATE TABLE IF NOT EXISTS social_events (
  event_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'OWNER',
  from_status TEXT,
  to_status TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES social_jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_social_events_job ON social_events(job_id,created_at);
CREATE TABLE IF NOT EXISTS social_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO social_settings(key,value) VALUES ('paused','false');
INSERT OR IGNORE INTO social_settings(key,value) VALUES ('target_daily','10');
INSERT OR IGNORE INTO social_settings(key,value) VALUES ('timezone','Asia/Makassar');
INSERT OR IGNORE INTO social_settings(key,value) VALUES ('tiktok_handle','');
