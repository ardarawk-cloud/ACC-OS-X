-- NADMO LIVE next milestone: authenticated identity data model, NOT applied to current beta.
-- D1-compatible SQLite. Never store raw KTP/NIK, passports, driver's licenses, selfies
-- or biometric templates here. Verification providers handle sensitive document capture.
-- Every public GO LIVE must later require server-side authenticated & VERIFIED adult status.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  handle TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','suspended','closed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK(length(handle) BETWEEN 3 AND 24 AND handle NOT GLOB '*[^a-z0-9_]*')
);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- External login provider subject reference only. Never store passwords or OTP values.
CREATE TABLE IF NOT EXISTS account_identities (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject_hmac TEXT NOT NULL,
  linked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(provider,provider_subject_hmac)
);
CREATE INDEX IF NOT EXISTS idx_identities_account ON account_identities(account_id);

-- Hashed, opaque session tokens only; expire and rotate after risk events.
CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK(expires_at > issued_at)
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON account_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON account_sessions(expires_at);

-- One primary verified creator identity per person, across multiple business profiles.
-- dedup_hmac is a SECRET-KEYED, provider-approved subject fingerprint, not SHA256(NIK).
-- NULL while pending. The actual ID photos, faces, ID numbers remain at KYC provider.
CREATE TABLE IF NOT EXISTS creator_verifications (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','verified','rejected','expired','revoked','manual_review')),
  provider TEXT,
  provider_reference TEXT,
  dedup_hmac TEXT UNIQUE,
  adult_verified INTEGER NOT NULL DEFAULT 0 CHECK(adult_verified IN (0,1)),
  verified_at INTEGER,
  expires_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK(status <> 'verified' OR
    (provider IS NOT NULL AND provider_reference IS NOT NULL
    AND dedup_hmac IS NOT NULL AND adult_verified=1 AND verified_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON creator_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_provider_ref ON creator_verifications(provider,provider_reference);

-- One account may own several business identities/channels without opening fake accounts.
CREATE TABLE IF NOT EXISTS creator_channels (
  id TEXT PRIMARY KEY NOT NULL,
  owner_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK(length(slug) BETWEEN 3 AND 40)
);
CREATE INDEX IF NOT EXISTS idx_creator_channels_owner ON creator_channels(owner_account_id);

-- Open external promotion. Backend must revalidate URLs before write; no URL shorteners
-- are required. Follow links directly, without NADMO traffic-trap redirects.
CREATE TABLE IF NOT EXISTS channel_links (
  id TEXT PRIMARY KEY NOT NULL,
  channel_id TEXT NOT NULL REFERENCES creator_channels(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK(length(label) BETWEEN 1 AND 40),
  CHECK(length(destination_url) BETWEEN 9 AND 500),
  CHECK(substr(destination_url,1,8)='https://')
);
CREATE INDEX IF NOT EXISTS idx_channel_links ON channel_links(channel_id,sort_order);

-- Drafts or published social posts with first-class URL-containing captions.
CREATE TABLE IF NOT EXISTS creator_posts (
  id TEXT PRIMARY KEY NOT NULL,
  owner_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  channel_id TEXT REFERENCES creator_channels(id) ON DELETE SET NULL,
  caption TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden','deleted')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  published_at INTEGER,
  CHECK(length(caption) BETWEEN 1 AND 2000)
);
CREATE INDEX IF NOT EXISTS idx_creator_posts_channel ON creator_posts(channel_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_posts_owner ON creator_posts(owner_account_id,created_at DESC);

CREATE TABLE IF NOT EXISTS account_follows (
  follower_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  followed_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  followed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(follower_account_id,followed_account_id),
  CHECK(follower_account_id<>followed_account_id)
);
CREATE INDEX IF NOT EXISTS idx_account_follows_followed ON account_follows(followed_account_id);

-- Non-public compliance logs: NO raw document scans or biometric values.
CREATE TABLE IF NOT EXISTS identity_audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  opaque_reference TEXT,
  occurred_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_identity_audit_account_time
  ON identity_audit_events(account_id,occurred_at DESC);

-- All these tables are inert until KYC vendor, authentication, D1 binding,
-- audited authorization and legal/privacy gates are integrated and tested.
