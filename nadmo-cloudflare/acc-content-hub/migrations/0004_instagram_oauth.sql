-- Owner-only Instagram Login credentials. Token cipher is AES-256-GCM; encryption key lives only in Worker secret.
CREATE TABLE IF NOT EXISTS social_instagram_oauth_states (
  state TEXT PRIMARY KEY,
  channel_key TEXT NOT NULL REFERENCES social_channels(channel_key),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_social_ig_oauth_expires ON social_instagram_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS social_instagram_accounts (
  account_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  account_type TEXT NOT NULL,
  token_cipher TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_social_ig_accounts_expire ON social_instagram_accounts(token_expires_at);
